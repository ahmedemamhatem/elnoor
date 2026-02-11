package com.sunyard.sdkserviceinvokedemo;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import android.app.Activity;
import android.app.ProgressDialog;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.os.RemoteException;
import android.text.TextUtils;
import android.util.Log;
import android.widget.Toast;

import com.sunyard.api.app.IAppManager;
import com.sunyard.api.app.OnAppDeleteListener;
import com.sunyard.api.app.OnAppInstallListener;
import com.sunyard.api.system.IUpdateListener;
import com.sunyard.sdkserviceinvokedemo.databinding.ActivitySystemUpdateBinding;
import com.sunyard.sdkserviceinvokedemo.service.DeviceServiceGet;
import com.sunyard.sdkserviceinvokedemo.util.FileUtil;

import java.io.File;

public class SystemUpdateActivity extends AppCompatActivity {
    ActivitySystemUpdateBinding binding;
    private static final int FILE_SELECT_INTENT_SP = 100;
    private static final int FILE_SELECT_INTENT_OTA = 101;
    private static final String TAG = "SystemUpdateActivity_SYD";

    ProgressDialog dialog;
//    private FileSelectBackListener fileSelectBackListener;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivitySystemUpdateBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        binding.btSpChoose.setOnClickListener(view -> {
            chooseFile(true);
        });
        binding.btUpdateSp.setOnClickListener(view -> {
            updateSp();
        });
        binding.btApChoose.setOnClickListener(view -> {
            chooseFile(false);
        });
        binding.btUpdateOta.setOnClickListener(view -> {
            updateOta();
        });
    }


    private void chooseFile(boolean isSP) {
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.setType("*/*");
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        startActivityForResult(intent, isSP ? FILE_SELECT_INTENT_SP : FILE_SELECT_INTENT_OTA);
       /* this.fileSelectBackListener = new FileSelectBackListener() {
            @Override
            public void onSelect(String filePath) {
                fileSelectBackListener = null;
                setResult("selected filepath:" + filePath);
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {

                    }
                });
            }
        };*/
    }
    private void updateSp() {
        String filePath = binding.editSp.getText().toString();
        if (filePath.length() == 0) {
            return;
        }
        //File file = new File(filePath);
        setResult("start update sp ,file path:" + filePath);
        //setResult("file exists:" + file.exists());
        //if (file.exists()) {
        if (otaTimeoutThread != null && otaTimeoutThread.isAlive()) {
            otaTimeoutThread.interrupt();
            otaTimeoutThread = null;
        }
        showDialog("sp updating");
        otaTimeoutThread = new OtaTimeoutThread(180);
        otaTimeoutThread.start();
        try {
            //String filePath = "/sdcard/update_sp.bin";
            DeviceServiceGet.getInstance().getSystemManager().updateSystem(filePath, 0, new IUpdateListener.Stub() {
                @Override
                public void onSuccess() throws RemoteException {
                    setResult("Update SP system successfully");
                    otaTimeoutThread.interrupt();
                    dismissDialog();
                }

                @Override
                public void onError(int ret, String errMsg) throws RemoteException {
                    setResult("Update SP system failed, ret = " + ret + ", errMsg:" + errMsg);
                    otaTimeoutThread.interrupt();
                    dismissDialog();
                }
            });
        } catch (RemoteException e) {
            e.printStackTrace();
            setResult("Update SP system fail");
            otaTimeoutThread.interrupt();
            dismissDialog();
        }
        //}
    }

    private void updateOta() {
        String filePath = binding.editAp.getText().toString();
        if (filePath.length() == 0) {
            return;
        }
        //File file = new File(filePath);
        setResult("start update ota,file path:" + filePath);
        //setResult("file exists:" + file.exists());
        //if (file.exists()) {
        setResult("Start OTA upgrade, if successful, will jump to the system upgrade interface.");
        makeToast("check whether jump to the system upgrade interface");
        if (otaTimeoutThread != null && otaTimeoutThread.isAlive()) {
            otaTimeoutThread.interrupt();
            otaTimeoutThread = null;
        }
        showDialog("ota updating,if successful, will jump to the system upgrade interface.");
        otaTimeoutThread = new OtaTimeoutThread(60);
        otaTimeoutThread.start();
        try {
            DeviceServiceGet.getInstance().getSystemManager().updateSystem(filePath, 1, new IUpdateListener.Stub() {
                @Override
                public void onSuccess() throws RemoteException {
                    setResult("Update OTA successfully");
                }

                @Override
                public void onError(int ret, String errMsg) throws RemoteException {
                    setResult("Update OTA failed, ret = " + ret + ", errMsg:" + errMsg);
                }
            });
        } catch (RemoteException e) {
            e.printStackTrace();
            setResult("Update OTA fail");
        }
        //}
    }

    private void setResult(String res) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                String result = binding.tvResult.getText().toString();
                if (!TextUtils.isEmpty(result)) {
                    result += "\n";
                }
                result += res;
                binding.tvResult.setText(result);
            }
        });
    }

    private void makeToast(String toast) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                Toast.makeText(SystemUpdateActivity.this, toast, Toast.LENGTH_SHORT).show();
            }
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        Log.e(TAG, "onActivityResult," + requestCode + "," + resultCode);
        String filePath = null;
        setResult("onActivityResult requestCode:" + requestCode);
        if ((requestCode == FILE_SELECT_INTENT_SP | requestCode == FILE_SELECT_INTENT_OTA)
                && resultCode == Activity.RESULT_OK) {
            Uri uri = data.getData();
            if (uri != null) {
                setResult("onActivityResult uri:" + uri);
                Log.e(TAG, "onIntentResult uri:" + uri.toString());
                filePath = getPathFromUri(uri);
                Log.e(TAG, "onIntentResult filePath0:" + filePath);
                setFileChooseResult(requestCode, filePath);
            }
        }
        //backFileSelect(filePath);
    }

    private void setFileChooseResult(int requestCode, String filePath) {
        setResult("selected filepath:" + filePath);
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (requestCode == FILE_SELECT_INTENT_SP) {
                    binding.editSp.setText(filePath);
                } else {
                    binding.editAp.setText(filePath);
                }
            }
        });
    }

    /*private void backFileSelect(String filePath) {
        if (fileSelectBackListener != null) {
            fileSelectBackListener.onSelect(filePath);
        }
    }*/

    public String getPathFromUri(Uri uri) {
        Cursor cursor = null;
        String path = null;
        try {
            /*cursor = getActivity().getContentResolver().query(uri, null, null, null, null);
            if (cursor != null) {
                int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                cursor.moveToFirst();
                //文件名
                path = "/sdcard/" + cursor.getString(nameIndex);
            }*/
            path = FileUtil.getFileAbsolutePath(SystemUpdateActivity.this, uri);

            // 只查询媒体数据的数据列
            /*String[] projection = {MediaStore.Files.FileColumns.DATA};
            cursor = getActivity().getContentResolver().query(uri, projection, null, null, null);
            if (cursor != null && cursor.moveToFirst()) {
                AppLog.e(TAG, "getPathFromUri cursor.count=" + cursor.getCount());
                // 获取数据列的索引，一般只有一个数据列，即索引为0
                int columnIndex = cursor.getColumnIndexOrThrow(projection[0]);
                // 获取数据列的数据，即文件的真实路径
                path = cursor.getString(columnIndex);
            }*/
        } catch (Exception e) {
            // 处理异常情况
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }
        Log.e(TAG, "getPathFromUri filePath:" + path);
        return path;
    }


    private void showDialog(final String message) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (dialog != null) {
                    if (dialog.isShowing()) {
                        dialog.dismiss();
                    }
                }
                dialog = new ProgressDialog(SystemUpdateActivity.this);
                dialog.setMessage(message);
                dialog.setIndeterminate(true);
                dialog.setCancelable(false);
                dialog.show();
            }
        });
    }

    private void dismissDialog() {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (dialog != null && dialog.isShowing()) {
                    dialog.dismiss();
                }
            }
        });
    }

    private OtaTimeoutThread otaTimeoutThread;

    class OtaTimeoutThread extends Thread {
        private int timeout;

        public OtaTimeoutThread(int timeout) {
            this.timeout = timeout;
        }

        @Override
        public void run() {
            super.run();
            long start = System.currentTimeMillis();
            boolean isStop = false;
            while (true) {
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
                long cur = System.currentTimeMillis();
                if ((cur - start) / 1000 >= timeout) {
                    break;
                }
            }
            dismissDialog();
        }
    }

    /*interface FileSelectBackListener {
        void onSelect(String filePath);
    }*/
}