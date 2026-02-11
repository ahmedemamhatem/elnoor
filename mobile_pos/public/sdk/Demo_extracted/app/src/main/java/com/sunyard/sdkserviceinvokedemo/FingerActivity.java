package com.sunyard.sdkserviceinvokedemo;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.RemoteException;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import com.sunyard.api.finger.FingerprintResult;
import com.sunyard.api.finger.IFinger;
import com.sunyard.api.finger.OnFingerprintListener;
import com.sunyard.sdkserviceinvokedemo.databinding.ActivityFingerBinding;
import com.sunyard.sdkserviceinvokedemo.service.DeviceServiceGet;

import java.util.Arrays;

public class FingerActivity extends AppCompatActivity{
    ActivityFingerBinding binding;
    IFinger finger;
    byte[] feature1,feature2,bitmap1,bitmap2;
    Handler mHandler=new Handler(Looper.getMainLooper());
    boolean isInit;
    int imageFormat=2,compress=10,featureFormat=1;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        binding = ActivityFingerBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        finger = DeviceServiceGet.getInstance().getFinger();
        binding.powerOnAndOpen.setOnClickListener(view -> {
            try {
                finger.fingerPowerOn();
                finger.fingerOpen();
                finger.fingerSetLFDLevel(3);
            } catch (RemoteException e) {
                throw new RuntimeException(e);
            }
            binding.tvResult.setText("powerOnAndOpen OK");
            isInit=true;
        });
        binding.scanFinger1.setOnClickListener(view -> {
            if (!isInit){
                binding.tvResult.setText("Please click the powerOnAndOpen button first ");
                return;
            }

            try {
                finger.setTimeOut(5*1000);
                finger.fingerCaptureImage(imageFormat, compress, featureFormat, new OnFingerprintListener.Stub() {
                    @Override
                    public void onError(int i) throws RemoteException {
                        binding.tvResult.setText("scanFinger1 Error:"+i);
                    }

                    @Override
                    public void onSuccess(FingerprintResult fingerprintResult) throws RemoteException {
                        binding.tvResult.setText("scanFinger1 OK,Quality:"+fingerprintResult.getImageQuality());
                        feature1=fingerprintResult.getFeatureCode();
                        bitmap1= fingerprintResult.getCaptureImage();
                        if (bitmap1==null)
                            return;
                        mHandler.post(new Runnable() {
                            @Override
                            public void run() {
                                binding.finger1.setImageBitmap(BitmapFactory.decodeByteArray(bitmap1,0,bitmap1.length));
                            }
                        });
                    }
                });
            } catch (RemoteException e) {
                throw new RuntimeException(e);
            }
        });

        binding.scanFinger2.setOnClickListener(view -> {
            if (!isInit){
                binding.tvResult.setText("Please click the powerOnAndOpen button first ");
                return;
            }
            try {
                finger.setTimeOut(5*1000);
                finger.fingerCaptureImage(imageFormat, compress, featureFormat,new OnFingerprintListener.Stub() {
                    @Override
                    public void onError(int i) throws RemoteException {
                        binding.tvResult.setText("scanFinger2 Error:"+i);
                    }

                    @Override
                    public void onSuccess(FingerprintResult fingerprintResult) throws RemoteException {
                        binding.tvResult.setText("scanFinger2 OK,Quality:"+fingerprintResult.getImageQuality());
                        feature2=fingerprintResult.getFeatureCode();
                        bitmap2= fingerprintResult.getCaptureImage();
                        mHandler.post(new Runnable() {
                            @Override
                            public void run() {
                                binding.finger2.setImageBitmap(BitmapFactory.decodeByteArray(bitmap2,0,bitmap2.length));
                            }
                        });
                    }
                });
            } catch (RemoteException e) {
                throw new RuntimeException(e);
            }
        });

        binding.verify1and2.setOnClickListener(view->{
            if (!isInit){
                binding.tvResult.setText("Please click the powerOnAndOpen button first ");
                return;
            }
            if (feature1==null||feature2==null) {
                binding.tvResult.setText("Please scan two fingerprints first ");
                return;
            }
            try {
                boolean verifyResult=finger.fingerVerify(3,feature1,feature2);
                binding.tvResult.setText("finger verify result:"+verifyResult);
            } catch (RemoteException e) {
                throw new RuntimeException(e);
            }
        });
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (finger!=null){
            try {
                finger.fingerClose();
                finger.fingerPowerOff();
            } catch (RemoteException e) {
                throw new RuntimeException(e);
            }
        }
    }
}

