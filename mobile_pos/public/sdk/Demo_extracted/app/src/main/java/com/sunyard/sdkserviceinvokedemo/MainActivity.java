package com.sunyard.sdkserviceinvokedemo;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.provider.Settings;
import android.util.Log;
import android.widget.Toast;

import com.sunyard.sdkserviceinvokedemo.databinding.ActivityMainBinding;
import com.sunyard.sdkserviceinvokedemo.service.DeviceService;
import com.sunyard.sdkserviceinvokedemo.service.DeviceServiceGet;

import java.util.ArrayList;

public class MainActivity extends AppCompatActivity {

    private static final int REQUEST_OVERLAY_PERMISSION = 11;
    private final String TAG = "MainActivity_SYD";

    ActivityMainBinding binding;
    private boolean isConnectSuc = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityMainBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        binding.btBind.setOnClickListener(view -> {
            bindService();
        });
        binding.btGeneral.setOnClickListener(view -> {
            Intent intent = new Intent(MainActivity.this, GeneralActivity.class);
            startActivity(intent);
        });
        binding.btCard.setOnClickListener(view -> {
            Intent intent = new Intent(MainActivity.this, CardActivity.class);
            startActivity(intent);
        });
        binding.btPed.setOnClickListener(view -> {
            Intent intent = new Intent(MainActivity.this, PedActivity.class);
            startActivity(intent);
        });
        binding.btDukpt.setOnClickListener(view -> {
            Intent intent = new Intent(MainActivity.this, DukptActivity.class);
            startActivity(intent);
        });
        binding.btPrint.setOnClickListener(view -> {
            Intent intent = new Intent(MainActivity.this, PrintActivity.class);
            startActivity(intent);
        });
        binding.btFinger.setOnClickListener(view -> {
            Intent intent = new Intent(MainActivity.this, FingerActivity.class);
            startActivity(intent);
        });
        binding.btApn.setOnClickListener(view -> {
            Intent intent = new Intent(MainActivity.this, APNActivity.class);
            startActivity(intent);
        });
        binding.btSystemUpdate.setOnClickListener(view -> {
            Intent intent = new Intent(MainActivity.this, SystemUpdateActivity.class);
            startActivity(intent);
        });
        binding.btSerial.setOnClickListener(view -> {
            Intent intent = new Intent(MainActivity.this, SerialPortActivity.class);
            startActivity(intent);
        });
        binding.btM1.setOnClickListener(view -> {
            Intent intent = new Intent(MainActivity.this, M1CardActivity.class);
            startActivity(intent);
        });
        binding.btOthers.setOnClickListener(view -> {
            Intent intent = new Intent(MainActivity.this, OthersActivity.class);
            startActivity(intent);
        });
        binding.btSle4428.setOnClickListener(v -> {
            Intent intent = new Intent(MainActivity.this, Sle44428CardActivity.class);
            startActivity(intent);
        });
        binding.btLed.setOnClickListener(view -> {
            Intent intent = new Intent(MainActivity.this, LedLightActivity.class);
            startActivity(intent);
        });
        binding.btPsam.setOnClickListener(view -> {
            Intent intent = new Intent(MainActivity.this, PsamActivity.class);
            startActivity(intent);
        });
        binding.btGuestDisplay.setOnClickListener(view -> {
            Intent intent = new Intent(MainActivity.this, GuestDisplayActivity.class);
            startActivity(intent);
        });
        requestPer();
        //requestSysAlert();
        intBtn(false);
    }

    private void bindService() {
        DeviceService.init(this, new DeviceServiceGet.OnServiceConnectedListener() {
            @Override
            public void onServiceConnected() {
                if (!isConnectSuc) {
                    Message message = handler.obtainMessage(100);
                    handler.handleMessage(message);
                }
                isConnectSuc = true;
            }

            @Override
            public void onServiceDisConnected() {
                isConnectSuc = false;
                Message message = handler.obtainMessage(101);
                handler.handleMessage(message);
                /*new Thread(){
                    @Override
                    public void run() {
                        super.run();
                        try {
                            Thread.sleep(5000);
                        } catch (InterruptedException e) {
                            e.printStackTrace();
                        }
                        bindService();
                    }
                }.start();*/
            }
        });
    }

    private Handler handler = new Handler(Looper.getMainLooper()) {
        @Override
        public void handleMessage(@NonNull Message msg) {
            super.handleMessage(msg);
            switch (msg.what) {
                case 100:
                    Toast.makeText(MainActivity.this, "bind service successul", Toast.LENGTH_SHORT).show();
                    intBtn(true);
                    break;
                case 101:
                    Toast.makeText(MainActivity.this, "bind service failed", Toast.LENGTH_SHORT).show();
                    intBtn(false);
                    bindService();
                    break;
            }
        }
    };

    private void intBtn(boolean bind) {
        binding.btGeneral.setClickable(bind);
        binding.btGeneral.setBackgroundColor(getResources().getColor(bind ? R.color.teal_200 : R.color.grey_aaa));
        binding.btCard.setClickable(bind);
        binding.btCard.setBackgroundColor(getResources().getColor(bind ? R.color.teal_200 : R.color.grey_aaa));
        binding.btPed.setClickable(bind);
        binding.btPed.setBackgroundColor(getResources().getColor(bind ? R.color.teal_200 : R.color.grey_aaa));
        binding.btDukpt.setClickable(bind);
        binding.btDukpt.setBackgroundColor(getResources().getColor(bind ? R.color.teal_200 : R.color.grey_aaa));
        binding.btFinger.setClickable(bind);
        binding.btFinger.setBackgroundColor(getResources().getColor(bind ? R.color.teal_200 : R.color.grey_aaa));
        binding.btPrint.setClickable(bind);
        binding.btPrint.setBackgroundColor(getResources().getColor(bind ? R.color.teal_200 : R.color.grey_aaa));
        binding.btApn.setClickable(bind);
        binding.btApn.setBackgroundColor(getResources().getColor(bind ? R.color.teal_200 : R.color.grey_aaa));
        binding.btSystemUpdate.setClickable(bind);
        binding.btSystemUpdate.setBackgroundColor(getResources().getColor(bind ? R.color.teal_200 : R.color.grey_aaa));
        binding.btSerial.setClickable(bind);
        binding.btSerial.setBackgroundColor(getResources().getColor(bind ? R.color.teal_200 : R.color.grey_aaa));
        binding.btM1.setClickable(bind);
        binding.btM1.setBackgroundColor(getResources().getColor(bind ? R.color.teal_200 : R.color.grey_aaa));
        binding.btSle4428.setClickable(bind);
        binding.btSle4428.setBackgroundColor(getResources().getColor(bind ? R.color.teal_200 : R.color.grey_aaa));
        binding.btLed.setClickable(bind);
        binding.btLed.setBackgroundColor(getResources().getColor(bind ? R.color.teal_200 : R.color.grey_aaa));
        binding.btPsam.setClickable(bind);
        binding.btPsam.setBackgroundColor(getResources().getColor(bind ? R.color.teal_200 : R.color.grey_aaa));
        binding.btGuestDisplay.setClickable(bind);
        binding.btGuestDisplay.setBackgroundColor(getResources().getColor(bind ? R.color.teal_200 : R.color.grey_aaa));
    }

    private void requestPer() {
        String[] permissions = {
                android.Manifest.permission.READ_EXTERNAL_STORAGE,
                android.Manifest.permission.WRITE_EXTERNAL_STORAGE,
                //android.Manifest.permission.QUERY_ALL_PACKAGES,

        };
        ArrayList<String> perList = new ArrayList<>();
        for (String per : permissions) {
            Log.e(TAG, "per:" + per);
            if (ContextCompat.checkSelfPermission(this, per) != PackageManager.PERMISSION_GRANTED) {
                Log.e(TAG, "PERMISSION_GRANTED:false");
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                        && per.equals(android.Manifest.permission.READ_EXTERNAL_STORAGE)) {
                    perList.add(android.Manifest.permission.READ_MEDIA_AUDIO);
                    perList.add(android.Manifest.permission.READ_MEDIA_IMAGES);
                    perList.add(Manifest.permission.READ_MEDIA_VIDEO);
                } else {
                    perList.add(per);
                }
            }
        }
        if (perList.size() > 0) {
            String[] pers = new String[perList.size()];
            for (int i = 0; i < perList.size(); i++) {
                Log.e(TAG, "perList.get(i):" + perList.get(i));
                pers[i] = perList.get(i);
            }
//            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            ActivityCompat.requestPermissions(this, pers, 10);
//            }
        }
    }

    public void requestSysAlert() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && !Settings.canDrawOverlays(this)) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + getPackageName()));
            startActivityForResult(intent, REQUEST_OVERLAY_PERMISSION);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == 10) {
            for (int i = 0; i < permissions.length; i++) {
                Log.e(TAG, "permission:" + permissions[i] + ",result:" + grantResults[i]);
            }
        }
    }
}