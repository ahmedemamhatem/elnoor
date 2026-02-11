package com.sunyard.sdkserviceinvokedemo;

import androidx.appcompat.app.AppCompatActivity;

import android.os.Bundle;
import android.os.RemoteException;
import android.view.View;

import com.sunyard.sdkserviceinvokedemo.databinding.ActivityLedLightBinding;
import com.sunyard.sdkserviceinvokedemo.databinding.ActivityOthersBinding;
import com.sunyard.sdkserviceinvokedemo.service.DeviceServiceGet;

public class LedLightActivity extends AppCompatActivity implements View.OnClickListener{
    ActivityLedLightBinding binding;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityLedLightBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        binding.openAllLed.setOnClickListener(this);
        binding.closeAllLed.setOnClickListener(this);
        binding.openBlueLed.setOnClickListener(this);
        binding.closeBlueLed.setOnClickListener(this);
        binding.openYellowLed.setOnClickListener(this);
        binding.closeYellowLed.setOnClickListener(this);
        binding.openGreenLed.setOnClickListener(this);
        binding.closeGreenLed.setOnClickListener(this);
        binding.openRedLed.setOnClickListener(this);
        binding.closeRedLed.setOnClickListener(this);
    }

    @Override
    public void onClick(View v) {
        int id=v.getId();
        if (id==R.id.open_all_led){
            turnOnLed(1);
            turnOnLed(2);
            turnOnLed(3);
            turnOnLed(4);
        }else if (id==R.id.close_all_led){
            turnOffLed(1);
            turnOffLed(2);
            turnOffLed(3);
            turnOffLed(4);
        }else if (id==R.id.open_blue_led){
            turnOnLed(1);
        }else if (id==R.id.close_blue_led){
            turnOffLed(1);
        }else if (id==R.id.open_yellow_led){
            turnOnLed(2);
        }else if (id==R.id.close_yellow_led){
            turnOffLed(2);
        }else if (id==R.id.open_green_led){
            turnOnLed(3);
        }else if (id==R.id.close_green_led){
            turnOffLed(3);
        }else if (id==R.id.open_red_led){
            turnOnLed(4);
        }else if (id==R.id.close_red_led){
            turnOffLed(4);
        }

    }

    private void turnOnLed(int ledColor){
        try {
            DeviceServiceGet.getInstance().getLed().turnOn(ledColor);
        } catch (RemoteException e) {
            throw new RuntimeException(e);
        }
    }

    private void turnOffLed(int ledColor){
        try {
            DeviceServiceGet.getInstance().getLed().turnOff(ledColor);
        } catch (RemoteException e) {
            throw new RuntimeException(e);
        }
    }

}