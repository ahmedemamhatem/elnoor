package com.sunyard.sdkserviceinvokedemo;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.CountDownTimer;
import android.os.RemoteException;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;

import com.sunyard.api.guestdisplay.IGuestDisplayManager;
import com.sunyard.sdkserviceinvokedemo.databinding.ActivityGuestDisplayBinding;
import com.sunyard.sdkserviceinvokedemo.service.DeviceServiceGet;
import com.sunyard.sdkserviceinvokedemo.util.BitmapUtil;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

public class GuestDisplayActivity extends AppCompatActivity implements View.OnClickListener{
    ActivityGuestDisplayBinding binding;
    IGuestDisplayManager iGuestDisplayManager;
    float textX=50,textX1=50;
    private boolean scrollingText;
    int displayWidth =320,displayHeight =240;
    private static final String TAG=GuestDisplayActivity.class.getSimpleName();

    private enum MediaType{
        IMAGE,VIDEO;
    }

    private MediaType mediaType;
    CountDownTimer countDownTimer=new CountDownTimer(60*60*1000,100) {
        @Override
        public void onTick(long millisUntilFinished) {
            Bitmap bitmap=getScrollTextBitmap();
            byte[] guestDisplay= BitmapUtil.bitmapToByteArray(bitmap);
            if (iGuestDisplayManager!=null){
                int ret=0;
                try {
                    ret=iGuestDisplayManager.setGuestDisplayImage(guestDisplay);
                } catch (RemoteException e) {
                    e.printStackTrace();
                }
                if(ret!=0){
                    countDownTimer.cancel();
                    Toast.makeText(getApplicationContext(),"guestdisplay show fail:"+ret, Toast.LENGTH_LONG).show();
                }
            }
        }

        @Override
        public void onFinish() {

        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityGuestDisplayBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        iGuestDisplayManager= DeviceServiceGet.getInstance().getGuestDisplayManager();
        binding.showImageOnGuestdisplay.setOnClickListener(this);
        binding.showTextOnGuestdisplay.setOnClickListener(this);
        binding.showScrollingTextOnGuestdisplay.setOnClickListener(this);
        binding.turnOffGuestdisplay.setOnClickListener(this);
        binding.selectPicturePath.setOnClickListener(this);
        binding.selectVideoPath.setOnClickListener(this);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        countDownTimer.cancel();
    }

    private Bitmap getScrollTextBitmap(){
        Bitmap bitmap = Bitmap.createBitmap(displayWidth, displayHeight, Bitmap.Config.ARGB_8888);

        Canvas canvas = new Canvas(bitmap);
        Paint paint = new Paint();
        paint.setColor(Color.WHITE);
        paint.setTextSize(30);
        canvas.drawColor(Color.BLUE);

        textX=drawText("Welcome to Sunyard.Nice to meet you!",textX,60,paint,canvas); //The text length exceeds the screen width
        textX1=drawText("Welcome to Sunyard",textX1,190,paint,canvas);//The text length does not exceed the screen width
        return bitmap;
    }

    float drawText(String text,float textX, float textY,Paint paint,Canvas canvas){
        float textWidth=paint.measureText(text);
        float offX=10;
        float headTailGap=80;
        if (textWidth<=displayWidth){
            if (textX<=-displayWidth){
                textX=-offX;
            }else {
                textX=textX-offX;
            }
            canvas.drawText(text, textX, textY, paint);
            canvas.drawText(text, displayWidth+textX, textY, paint);
        }else {
            if (textX<=-textWidth){
                textX=textWidth+textX+headTailGap;
            }else {
                textX=textX-offX;
            }
            canvas.drawText(text, textX, textY, paint);
            canvas.drawText(text, textWidth+textX+headTailGap, textY, paint);
        }
        return textX;
    }


    @Override
    public void onClick(View v) {
        int viewID=v.getId();
        if (viewID==R.id.show_scrollingText_on_guestdisplay){
            if (!scrollingText) {
                countDownTimer.start();
                scrollingText=true;
            } else {
                countDownTimer.cancel();
                scrollingText=false;
            }
        }else {
            if (scrollingText){
                countDownTimer.cancel();
                scrollingText=false;
            }
        }

        if (iGuestDisplayManager==null)
            return;

        boolean needShowToast=true;
        int ret=0;
        if (viewID==R.id.show_image_on_guestdisplay){
            Bitmap bitmap = BitmapFactory.decodeResource(getResources(), R.drawable.test_pic);
            byte[] guestDisplay= BitmapUtil.bitmapToByteArray(bitmap);
            try {
                ret=iGuestDisplayManager.setGuestDisplayImage(guestDisplay);
            } catch (RemoteException e) {
                e.printStackTrace();
            }
        } else if (viewID==R.id.show_text_on_guestdisplay) {
            View textLayout= LayoutInflater.from(GuestDisplayActivity.this).inflate(R.layout.text_on_guest_display,null);
            TextView textView=textLayout.findViewById(R.id.show_text);
            textView.setText("Welcome to Sunyard");
            Bitmap bitmap=BitmapUtil.getLandscapeBitmapFromLayout(textLayout);
            byte[] guestDisplay= BitmapUtil.bitmapToByteArray(bitmap);
            try {
                ret=iGuestDisplayManager.setGuestDisplayImage(guestDisplay);
            } catch (RemoteException e) {
                e.printStackTrace();
            }
        }else if (viewID==R.id.turn_off_guestdisplay) {
            try {
                ret=iGuestDisplayManager.setGuestDisplayEnable(false);
            } catch (RemoteException e) {
                e.printStackTrace();
            }
        }else if (viewID==R.id.select_picturePath) {
            mediaType=MediaType.IMAGE;
            openImagePicker(mediaType);
            needShowToast=false;
        } else if (viewID==R.id.select_videoPath) {
//            mediaType=MediaType.VIDEO;
//            openImagePicker(mediaType);
            try {
                ret = iGuestDisplayManager.setGuestDisplayVideo("/storage/emulated/0/Movies/VID_20251014_110839_899.mp4");
            } catch (RemoteException e) {
                throw new RuntimeException(e);
            }
        }

        if (needShowToast) {
            if (ret == 0) {
                Toast.makeText(getApplicationContext(), "guestdisplay show success", Toast.LENGTH_LONG).show();
            } else {
                Toast.makeText(getApplicationContext(), "guestdisplay show fail:" + ret, Toast.LENGTH_LONG).show();
            }
        }
    }

    private final ActivityResultLauncher<Intent> pickerLauncher =
            registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
                if (result.getResultCode() == RESULT_OK && result.getData() != null) {

                    Uri selectedImageUri = result.getData().getData();
                    if (selectedImageUri != null) {
                        String selectedPath = getPathFromUri(selectedImageUri);
                        if (selectedPath != null) {
                            Log.d(TAG, "Selected image path: " + selectedPath);
                            int ret=0;
                            try {
//                                List<String> arrayList=new ArrayList<>();
//                                arrayList.add("/storage/emulated/0/DCIM/Camera/IMG_20250813_153204_161.jpg");
//                                arrayList.add("/storage/emulated/0/DCIM/Camera/IMG_20250813_153203_122.jpg");
//                                arrayList.add("/storage/emulated/0/DCIM/Camera/IMG_20250813_153202_346.jpg");
                                if (mediaType==MediaType.IMAGE) {
                                    ret = iGuestDisplayManager.setGuestDisplayImagePath(selectedPath); //"/storage/emulated/0/DCIM/Camera/IMG_20250813_153202_346.jpg"
                                } else if (mediaType==MediaType.VIDEO) {
                                    ret = iGuestDisplayManager.setGuestDisplayVideo("/storage/emulated/0/Movies/VID_20251014_110839_899.mp4");//the width and height of the video must be 320*240
                                }
                            } catch (RemoteException e) {
                                throw new RuntimeException(e);
                            }
                            if (ret==0){
                                Toast.makeText(getApplicationContext(),"guestdisplay show success", Toast.LENGTH_LONG).show();
                            }else {
                                Toast.makeText(getApplicationContext(),"guestdisplay show fail:"+ret, Toast.LENGTH_LONG).show();
                            }
                        } else {
                            Toast.makeText(this, "Failed to get image path", Toast.LENGTH_SHORT).show();
                        }
                    }
                }
            });

    private void openImagePicker(MediaType mediaType) {
        Intent intent = new Intent(Intent.ACTION_PICK);
        String type="image/*";
        if (mediaType==MediaType.IMAGE){
            type="image/*";
        } else if (mediaType==MediaType.VIDEO) {
            type="video/*";
        }
        intent.setType(type);
        pickerLauncher.launch(intent);
    }

    private String getPathFromUri(Uri uri) {
        String[] projection = {MediaStore.Images.Media.DATA};
        try (Cursor cursor = getContentResolver().query(uri, projection, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int columnIndex = cursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATA);
                return cursor.getString(columnIndex);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error getting path from URI", e);
        }
        return null;
    }

}