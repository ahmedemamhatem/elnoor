package com.sunyard.sdkserviceinvokedemo.service;

import android.content.Context;
import android.content.Intent;

public class DeviceService {

    public static void init(Context paramContext, DeviceServiceGet.OnServiceConnectedListener
            paramOnServiceConnectedListener) {
        DeviceServiceGet serviceEngine = DeviceServiceGet.getInstance();
        Intent intent = new Intent("com.sunyard.api.device_service");
        intent.setPackage("com.sunyard.deviceservice");
        serviceEngine.init(paramContext, intent);
        serviceEngine.connect(paramOnServiceConnectedListener);
    }

    public static void uninit() {
        DeviceServiceGet.getInstance().disconnect();
    }
}
