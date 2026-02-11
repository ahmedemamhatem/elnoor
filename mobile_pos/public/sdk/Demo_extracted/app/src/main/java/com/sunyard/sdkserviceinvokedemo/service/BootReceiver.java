package com.sunyard.sdkserviceinvokedemo.service;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import android.util.Log;

import com.sunyard.sdkserviceinvokedemo.MainActivity;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        Log.e("syd", "onReceive " + intent.getAction());
        if (intent.getAction().equals(Intent.ACTION_BOOT_COMPLETED)) {
            Intent startupIntent = new Intent(context, MainActivity.class);
            startupIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(startupIntent);
//            Intent mIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
//            mIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
//            context.startActivity(mIntent);

            // 请求忽略电池优化
            /*Intent startIntent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            startIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startIntent.setData(Uri.parse("package:" + context.getPackageName()));
            context.startActivity(startIntent);*/
        }
    }
}
