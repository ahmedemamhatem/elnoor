package com.sunyard.sdkserviceinvokedemo.util;

import static android.os.Environment.MEDIA_MOUNTED;

import android.annotation.SuppressLint;
import android.content.ContentResolver;
import android.content.ContentUris;
import android.content.Context;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.FileUtils;
import android.provider.DocumentsContract;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.text.TextUtils;
import android.util.Log;

import androidx.annotation.RequiresApi;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

public class FileUtil {
    public static String dirPathName = "otaFile";
    public static String TAG = "FileUtil_SYD";

    public static String getFileAbsolutePath(Context context, Uri uri) {
        if (context == null || uri == null) {
            return null;
        }
        if (ContentResolver.SCHEME_CONTENT.equals(uri.getScheme())
                && Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {

        }
        //4.4以下的版本
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.KITKAT) {
            return getRealFilePath(context, uri);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT
                //&& Build.VERSION.SDK_INT < Build.VERSION_CODES.Q
                //&& DocumentsContract.isDocumentUri(context, uri)
                && ContentResolver.SCHEME_CONTENT.equals(uri.getScheme())
        ) {//大于4.4，小于10
            if (isExternalStorageDocument(uri)) {
                String docId = DocumentsContract.getDocumentId(uri);
                String[] split = docId.split(":");
                String type = split[0];
                if ("primary".equalsIgnoreCase(type)) {
                    if (split.length > 1) {
                        return Environment.getExternalStorageDirectory() + "/" + split[1];
                    } else {
                        return Environment.getExternalStorageDirectory() + "/";
                    }
                } else {
                    if (split.length > 1) {
                        return "/mnt/media_rw/" + split[0] + "/" + split[1];
                    } else {
                        Log.d(TAG, "getFileAbsolutePath return path error");
                    }
                }
            } else if (isDownloadsDocument(uri)) {
                //下载内容提供者时应当判断下载管理器是否被禁用
                int stateCode = context.getPackageManager().getApplicationEnabledSetting("com.android.providers.downloads");
                if (stateCode != 0 && stateCode != 1) {
                    return null;
                }
                String id = DocumentsContract.getDocumentId(uri);
                // 如果出现这个RAW地址，我们则可以直接返回!
                if (id.startsWith("raw:")) {
                    return id.replaceFirst("raw:", "");
                }
                if (id.contains(":")) {
                    String[] tmp = id.split(":");
                    if (tmp.length > 1) {
                        id = tmp[1];
                    }
                }
                Uri contentUri = Uri.parse("content://downloads/public_downloads");
                Log.d(TAG, "Uri: " + contentUri);
                try {
                    contentUri = ContentUris.withAppendedId(contentUri, Long.parseLong(id));
                } catch (Exception e) {
                    e.printStackTrace();
                }
                String path = getDataColumn(context, contentUri, null, null);
                if (path != null) return path;
                // 兼容某些特殊情况下的文件管理器!
                String fileName = getFileNameByUri(context, uri);
                if (fileName != null) {
                    path = Environment.getExternalStorageDirectory().toString() + "/Download/" + fileName;
                    return path;
                }

                /*String id = DocumentsContract.getDocumentId(uri);
                if (!TextUtils.isEmpty(id)) {
                    if (id.startsWith("raw:")) {//已经返回真实路径
                        return id.replaceFirst("raw:", "");
                    }
                }
                Uri contentUri = ContentUris.withAppendedId(Uri.parse("content://downloads/public_downloads"), Long.valueOf(id));
                return getDataColumn(context, contentUri, null, null);*/
            } else if (isMediaDocument(uri)) {
                String docId = DocumentsContract.getDocumentId(uri);
                String[] split = docId.split(":");
                String type = split[0];
                Uri contentUri = null;
                if ("image".equals(type)) {
                    contentUri = MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
                } else if ("video".equals(type)) {
                    contentUri = MediaStore.Video.Media.EXTERNAL_CONTENT_URI;
                } else if ("audio".equals(type)) {
                    contentUri = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
                }
                String selection = MediaStore.Images.Media._ID + "=?";
                String[] selectionArgs = new String[]{split[1]};
                return getDataColumn(context, contentUri, selection, selectionArgs);
            }
        }
       /* else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {// MediaStore (and general)  大于等于10
            return uriToFileApiQ(context, uri);
        }
        else if ("content".equalsIgnoreCase(uri.getScheme())) {
            // Return the remote address
            if (isGooglePhotosUri(uri)) {
                return uri.getLastPathSegment();
            }
            if (Build.VERSION.SDK_INT >= 24) {
                return getFilePathFromUri(context, uri); //content 类型
            } else {
                return getDataColumn(context, uri, null, null);
            }
        }
        // File
        else if ("file".equalsIgnoreCase(uri.getScheme())) {
            return uri.getPath();
        }*/
        return null;
    }

    /**
     * @param uri The Uri to check.
     * @return Whether the Uri authority is ExternalStorageProvider.
     */
    private static boolean isExternalStorageDocument(Uri uri) {
        return "com.android.externalstorage.documents".equals(uri.getAuthority());
    }

    /**
     * @param uri The Uri to check.
     * @return Whether the Uri authority is DownloadsProvider.
     */
    private static boolean isDownloadsDocument(Uri uri) {
        return "com.android.providers.downloads.documents".equals(uri.getAuthority());
    }

    private String getRealPathFromUri(Context context, Uri uri) {
        String[] projection = {MediaStore.Images.Media.DATA};
        Cursor cursor = context.getContentResolver().query(uri, projection, null, null, null);
        int columnIndexOrThrow = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATA);
        cursor.moveToFirst();
        String path = cursor.getString(columnIndexOrThrow);
        cursor.close();
        return path;
    }


    /**
     * Android 10 以上适配
     *
     * @param context
     * @param uri
     * @return
     */
    @RequiresApi(api = Build.VERSION_CODES.Q)
    private static String uriToFileApiQ(Context context, Uri uri) {
        File file = null;
        //android10以上转换
        if (uri.getScheme().equals(ContentResolver.SCHEME_FILE)) {
            file = new File(uri.getPath());
        } else if (uri.getScheme().equals(ContentResolver.SCHEME_CONTENT)) {
            //把文件复制到沙盒目录
            ContentResolver contentResolver = context.getContentResolver();
            Cursor cursor = contentResolver.query(uri, null, null, null, null);
            if (cursor.moveToFirst()) {
                @SuppressLint("Range")
                String displayName = cursor.getString(cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME));
                try {
                    InputStream is = contentResolver.openInputStream(uri);
//                    File file1 = new File(context.getExternalCacheDir().getAbsolutePath()+"/"+System.currentTimeMillis());
//                    if (!file1.exists()) {
//                        file1.mkdir();
//                    }
                    String dirPath = getFileDirPath(context, dirPathName);
                    File cache = new File(dirPath, displayName);
                    FileOutputStream fos = new FileOutputStream(cache);
                    FileUtils.copy(is, fos);
                    file = cache;
                    fos.close();
                    is.close();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }
        }
        return file.getAbsolutePath();
    }

    private static String getFileRelativePathByUri_API18(Context context, Uri uri) {
        final String[] projection;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            projection = new String[]{
                    MediaStore.MediaColumns.RELATIVE_PATH
            };
            try (Cursor cursor = context.getContentResolver().query(uri, projection, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int index = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.RELATIVE_PATH);
                    return cursor.getString(index);
                }
            }
        }
        return null;
    }

    public static String getFileDirPath(Context context, String dir) {
        String directoryPath = "";
        if (MEDIA_MOUNTED.equals(Environment.getExternalStorageState())) {//判断外部存储是否可用
            directoryPath = context.getExternalFilesDir(dir).getAbsolutePath();
        } else {//没外部存储就使用内部存储
            directoryPath = context.getFilesDir() + File.separator + dir;
        }
        File file = new File(directoryPath);
        if (!file.exists()) {//判断文件目录是否存在
            file.mkdirs();
        }
        return directoryPath;
    }


    public static String getFilePathFromUri(Context context, Uri uri) {
        String realFilePath = getRealFilePath(context, uri); //防止获取不到真实的地址，因此这里需要进行判断
        if (!TextUtils.isEmpty(realFilePath)) {
            return realFilePath;
        }
//        File filesDir = context.getApplicationContext().getFilesDir();
        String filesDir = getFileDirPath(context, dirPathName);
        String fileName = getFileName(uri);
        if (!TextUtils.isEmpty(fileName)) {
            File copyFile1 = new File(filesDir + File.separator + fileName);
            copyFile(context, uri, copyFile1);
            return copyFile1.getAbsolutePath();
        }
        return null;
    }

    private static void copyFile(Context context, Uri srcUri, File dstFile) {
        try {
            InputStream inputStream = context.getContentResolver().openInputStream(srcUri);
            if (inputStream == null) {
                return;
            }
            OutputStream outputStream = new FileOutputStream(dstFile);
            copyStream(inputStream, outputStream);
            inputStream.close();
            outputStream.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }


    private static int copyStream(InputStream input, OutputStream output) {
        final int BUFFER_SIZE = 1024 * 2;
        byte[] buffer = new byte[BUFFER_SIZE];
        BufferedInputStream in = new BufferedInputStream(input, BUFFER_SIZE);
        BufferedOutputStream out = new BufferedOutputStream(output, BUFFER_SIZE);
        int count = 0, n = 0;
        try {
            while ((n = in.read(buffer, 0, BUFFER_SIZE)) != -1) {
                out.write(buffer, 0, n);
                count += n;
            }
            out.flush();
        } catch (Exception e) {
        } finally {
            try {
                out.close();
                in.close();
            } catch (Exception e) {
            }
        }
        return count;
    }

    private static String getFileName(Uri uri) {
        if (uri == null) {
            return null;
        }
        String fileName = null;
        String path = uri.getPath();
        int cut = path.lastIndexOf('/');
        if (cut != -1) {
            fileName = path.substring(cut + 1);
        }
        return fileName;
    }


    private static boolean isMediaDocument(Uri uri) {
        return "com.android.providers.media.documents".equals(uri.getAuthority());
    }

    /**
     * @param uri The Uri to check.
     * @return Whether the Uri authority is Google Photos.
     */
    private static boolean isGooglePhotosUri(Uri uri) {
        return "com.google.android.apps.photos.content".equals(uri.getAuthority());
    }

    private static String getDataColumn(Context context, Uri uri, String selection, String[] selectionArgs) {
        Cursor cursor = null;
        String column = MediaStore.Images.Media.DATA;
        String[] projection = {column};
        try {
            cursor = context.getContentResolver().query(uri, projection, selection, selectionArgs, null);
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndexOrThrow(column);
                return cursor.getString(index);
            }
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }
        return null;
    }


    private static String getRealFilePath(final Context context, final Uri uri) {
        if (null == uri) {
            return null;
        }
        final String scheme = uri.getScheme();
        String data = null;
        if (scheme == null) {
            data = uri.getPath();
        } else if (ContentResolver.SCHEME_FILE.equals(scheme)) {
            data = uri.getPath();
        } else if (ContentResolver.SCHEME_CONTENT.equals(scheme)) {
            String[] projection = {MediaStore.Images.ImageColumns.DATA};
            Cursor cursor = context.getContentResolver().query(uri, projection, null, null, null);
            if (null != cursor) {
                if (cursor.moveToFirst()) {
                    int index = cursor.getColumnIndex(MediaStore.Images.ImageColumns.DATA);
                    if (index > -1) {
                        data = cursor.getString(index);
                    }
                }
                cursor.close();
            }
        }
        return data;
    }

    @SuppressLint("Range")
    private static String getFileFromContentUri(Context context, Uri uri) {
        if (uri == null) {
            return null;
        }
        String filePath;
        String[] filePathColumn = {MediaStore.MediaColumns.DATA, MediaStore.MediaColumns.DISPLAY_NAME};
        ContentResolver contentResolver = context.getContentResolver();
        Cursor cursor = contentResolver.query(uri, filePathColumn, null,
                null, null);
        if (cursor != null) {
            cursor.moveToFirst();
            try {
                filePath = cursor.getString(cursor.getColumnIndex(filePathColumn[0]));
                return filePath;
            } catch (Exception e) {
            } finally {
                cursor.close();
            }
        }
        return "";
    }

    private static String getFileNameByUri(Context context, Uri uri) {
        String relativePath = getFileRelativePathByUri_API18(context, uri);
        if (relativePath == null) relativePath = "";
        final String[] projection = {
                MediaStore.MediaColumns.DISPLAY_NAME
        };
        try (Cursor cursor = context.getContentResolver().query(uri, projection, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int index = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.DISPLAY_NAME);
                return relativePath + cursor.getString(index);
            }
        }
        return null;
    }
}
