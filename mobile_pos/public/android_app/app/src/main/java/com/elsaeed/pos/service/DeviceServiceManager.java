package com.elsaeed.pos.service;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.IBinder;
import android.os.RemoteException;
import android.util.Log;

import com.sunyard.api.IDeviceService;
import com.sunyard.api.deviceinfo.IDeviceInfo;
import com.sunyard.api.printer.IPrinter;

/**
 * Singleton manager for Sunyard POS device SDK service
 * Handles connection to the SDK service and provides access to printer interface
 */
public class DeviceServiceManager {
    private static final String TAG = "DeviceServiceManager";

    // Sunyard SDK Service package and action (from official demo)
    private static final String SDK_SERVICE_PACKAGE = "com.sunyard.deviceservice";
    private static final String SDK_SERVICE_ACTION = "com.sunyard.api.device_service";

    private static DeviceServiceManager instance;
    private IDeviceService deviceService;
    private Context context;
    private ServiceConnection serviceConnection;
    private OnServiceConnectedListener serviceConnectedListener;
    private boolean isConnected = false;

    // Cached hardware interfaces
    private IPrinter printer;
    private IDeviceInfo deviceInfo;

    public interface OnServiceConnectedListener {
        void onServiceConnected();
        void onServiceDisconnected();
    }

    private DeviceServiceManager() {
        serviceConnection = new ServiceConnection() {
            @Override
            public void onServiceConnected(ComponentName name, IBinder service) {
                Log.d(TAG, "Service connected: " + name);
                deviceService = IDeviceService.Stub.asInterface(service);
                isConnected = true;

                // Pre-cache printer interface
                try {
                    printer = getPrinter();
                    deviceInfo = getDeviceInfo();
                } catch (Exception e) {
                    Log.e(TAG, "Error caching hardware interfaces", e);
                }

                if (serviceConnectedListener != null) {
                    serviceConnectedListener.onServiceConnected();
                }
            }

            @Override
            public void onServiceDisconnected(ComponentName name) {
                Log.d(TAG, "Service disconnected: " + name);
                deviceService = null;
                isConnected = false;
                printer = null;
                deviceInfo = null;

                if (serviceConnectedListener != null) {
                    serviceConnectedListener.onServiceDisconnected();
                }
            }
        };
    }

    public static synchronized DeviceServiceManager getInstance() {
        if (instance == null) {
            instance = new DeviceServiceManager();
        }
        return instance;
    }

    public void init(Context ctx) {
        this.context = ctx.getApplicationContext();
    }

    public void connect(OnServiceConnectedListener listener) {
        this.serviceConnectedListener = listener;

        if (context == null) {
            Log.e(TAG, "Context not initialized. Call init() first.");
            return;
        }

        try {
            // Primary binding: using action and package (as per demo code)
            Intent serviceIntent = new Intent(SDK_SERVICE_ACTION);
            serviceIntent.setPackage(SDK_SERVICE_PACKAGE);

            Log.d(TAG, "Attempting to bind to: " + SDK_SERVICE_PACKAGE + " with action: " + SDK_SERVICE_ACTION);

            boolean bound = context.bindService(serviceIntent, serviceConnection, Context.BIND_AUTO_CREATE);
            if (bound) {
                Log.d(TAG, "Binding to Sunyard SDK service...");
            } else {
                Log.e(TAG, "Failed to bind to Sunyard SDK service");

                // Try alternative binding method
                tryAlternativeBinding();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error connecting to service", e);
            // Try alternative on exception
            tryAlternativeBinding();
        }
    }

    private void tryAlternativeBinding() {
        try {
            // Alternative: Try explicit component name
            Intent serviceIntent = new Intent();
            serviceIntent.setComponent(new ComponentName(
                    "com.sunyard.deviceservice",
                    "com.sunyard.deviceservice.DeviceService"
            ));

            boolean bound = context.bindService(serviceIntent, serviceConnection, Context.BIND_AUTO_CREATE);
            if (bound) {
                Log.d(TAG, "Alternative binding successful");
            } else {
                Log.e(TAG, "Alternative binding also failed - SDK service may not be installed");
            }
        } catch (Exception e) {
            Log.e(TAG, "Alternative binding error", e);
        }
    }

    public void disconnect() {
        if (context != null && serviceConnection != null) {
            try {
                context.unbindService(serviceConnection);
            } catch (Exception e) {
                Log.e(TAG, "Error disconnecting service", e);
            }
        }
        isConnected = false;
    }

    public boolean isConnected() {
        return isConnected && deviceService != null;
    }

    // ==================== Hardware Interface Getters ====================

    public IPrinter getPrinter() {
        if (printer != null) return printer;

        if (deviceService == null) {
            Log.e(TAG, "Device service not connected");
            return null;
        }

        try {
            IBinder binder = deviceService.getPrinter();
            if (binder != null) {
                printer = IPrinter.Stub.asInterface(binder);
            }
            return printer;
        } catch (RemoteException e) {
            Log.e(TAG, "Error getting printer", e);
            return null;
        }
    }

    public IDeviceInfo getDeviceInfo() {
        if (deviceInfo != null) return deviceInfo;

        if (deviceService == null) {
            Log.e(TAG, "Device service not connected");
            return null;
        }

        try {
            IBinder binder = deviceService.getDeviceInfo();
            if (binder != null) {
                deviceInfo = IDeviceInfo.Stub.asInterface(binder);
            }
            return deviceInfo;
        } catch (RemoteException e) {
            Log.e(TAG, "Error getting device info", e);
            return null;
        }
    }

    public String getSDKVersion() {
        if (deviceService == null) return "Not connected";

        try {
            return deviceService.getVersion();
        } catch (RemoteException e) {
            Log.e(TAG, "Error getting SDK version", e);
            return "Error";
        }
    }

    // Stub methods for scanner - not implemented
    public Object getScanner() {
        return null;
    }

    public Object getBeeper() {
        return null;
    }

    public Object getLed() {
        return null;
    }
}
