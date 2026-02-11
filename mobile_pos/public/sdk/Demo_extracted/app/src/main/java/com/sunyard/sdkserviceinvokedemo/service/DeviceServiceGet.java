package com.sunyard.sdkserviceinvokedemo.service;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.IBinder;
import android.os.RemoteException;
import android.util.Log;

import com.sunyard.api.IDeviceService;
import com.sunyard.api.app.IAppManager;
import com.sunyard.api.beep.IBeeper;
import com.sunyard.api.deviceinfo.IDeviceInfo;
import com.sunyard.api.dukpt.IDukpt;
import com.sunyard.api.emv.IEmv;
import com.sunyard.api.finger.IFinger;
import com.sunyard.api.guestdisplay.IGuestDisplayManager;
import com.sunyard.api.insertreader.IInsertCardReader;
import com.sunyard.api.led.ILed;
import com.sunyard.api.magreader.IMagCardReader;
import com.sunyard.api.pinpad.IPinpad;
import com.sunyard.api.printer.IPrinter;
import com.sunyard.api.psam.IPsamReader;
import com.sunyard.api.rfreader.IRFCardReader;
import com.sunyard.api.scanner.IScanner;
import com.sunyard.api.serialport.ISerialPort;
import com.sunyard.api.synccardreader.IAT1604CardReader;
import com.sunyard.api.synccardreader.IAT1608CardReader;
import com.sunyard.api.synccardreader.IAT24CxxCardReader;
import com.sunyard.api.synccardreader.ISIM4428CardReader;
import com.sunyard.api.synccardreader.ISIM4442CardReader;
import com.sunyard.api.system.ISystemManager;

public class DeviceServiceGet {
    private static String TAG = DeviceServiceGet.class.getSimpleName();
    private static DeviceServiceGet instance = new DeviceServiceGet();
    private IDeviceService devServ;
    private Context context;
    private ServiceConnection connectionConnected;
    private boolean hasStartedService = false;
    private Intent serviceIntent;
    private OnServiceConnectedListener onServiceConnectedlistener;

    private ServiceConnection connection = new ServiceConnection() {
        public void onServiceConnected(ComponentName paramAnonymousComponentName, IBinder paramAnonymousIBinder) {
            Log.e(TAG, "onServiceConnected");
            DeviceServiceGet.this.devServ = IDeviceService.Stub.asInterface(paramAnonymousIBinder);
            if (DeviceServiceGet.this.onServiceConnectedlistener != null) {
                DeviceServiceGet.this.onServiceConnectedlistener.onServiceConnected();
            }
        }

        public void onServiceDisconnected(ComponentName paramAnonymousComponentName) {
            Log.e(TAG, "onServiceDisconnected");
            if (DeviceServiceGet.this.onServiceConnectedlistener != null) {
                DeviceServiceGet.this.onServiceConnectedlistener.onServiceDisConnected();
                DeviceServiceGet.this.onServiceConnectedlistener = null;
            }
            DeviceServiceGet.this.devServ = null;
        }
    };

    public static interface OnServiceConnectedListener {
        public void onServiceConnected();

        void onServiceDisConnected();
    }

    public static DeviceServiceGet getInstance() {
        return instance;
    }

    public void init(Context paramContext, Intent paramIntent) {
        this.context = paramContext.getApplicationContext();
        this.serviceIntent = paramIntent;
        //this.serviceIntent.setPackage("com.sunyard.sdk");

    }

    public void connect(OnServiceConnectedListener paramOnServiceConnectedListener) {
        if (this.context.bindService(this.serviceIntent, this.connection, Context.BIND_AUTO_CREATE)) {
            Log.d(TAG, "===>bindService success");
            this.connectionConnected = this.connection;
            this.onServiceConnectedlistener = paramOnServiceConnectedListener;
        } else {
            Log.e(TAG, "===>bindService failed");
        }
    }

    public void disconnect() {
        if (this.connectionConnected != null) {
            this.context.unbindService(this.connectionConnected);
            this.hasStartedService = false;
        }
    }

    public String getVersion() {
        try {
            return this.devServ.getVersion();
        } catch (RemoteException e) {
            e.printStackTrace();
            return null;
        }
    }

    public IBeeper getBeeper() {
        try {
            return IBeeper.Stub.asInterface(this.devServ.getBeeper());
        } catch (RemoteException e) {
            e.printStackTrace();
            return null;
        }
    }

    public ILed led() {
        try {
            return ILed.Stub.asInterface(this.devServ.getLed());
        } catch (RemoteException e) {
            throw new RuntimeException(e);
        }
    }

    public IDeviceInfo getDeviceInfo() {
        try {
            return IDeviceInfo.Stub.asInterface(this.devServ.getDeviceInfo());
        } catch (RemoteException e) {
            e.printStackTrace();
            return null;
        }
    }

    public IDukpt getDukpt() {
        try {
            return IDukpt.Stub.asInterface(this.devServ.getTDukpt());
        } catch (RemoteException e) {
            e.printStackTrace();
            return null;
        }
    }

    public IEmv getEmv() {
        try {
            IBinder binder = this.devServ.getEMV();
            Log.e(TAG, "getEmv binder is null? " + (binder == null));
            return IEmv.Stub.asInterface(binder);
        } catch (RemoteException e) {
            e.printStackTrace();
            return null;
        }
    }

    public IInsertCardReader getInsertCardReader() {
        try {
            return IInsertCardReader.Stub.asInterface(this.devServ.getInsertCardReader());
        } catch (RemoteException e) {
            e.printStackTrace();
            return null;
        }
    }

    public ILed getLed() {
        try {
            return ILed.Stub.asInterface(this.devServ.getLed());
        } catch (RemoteException e) {
            e.printStackTrace();
            return null;
        }
    }

    public IMagCardReader getMagCardReader() {
        try {
            return IMagCardReader.Stub.asInterface(this.devServ.getMagCardReader());
        } catch (RemoteException e) {
            e.printStackTrace();
            return null;
        }
    }

    public IPinpad getPinpad() {
        try {
            return IPinpad.Stub.asInterface(this.devServ.getPinpad(0));
        } catch (RemoteException e) {
            e.printStackTrace();
            return null;
        }
    }

    public IPrinter getPrinter() {
        try {
            return IPrinter.Stub.asInterface(this.devServ.getPrinter());
        } catch (RemoteException e) {
            e.printStackTrace();
            return null;
        }
    }

    public IRFCardReader getRFCardReader() {
        try {
            return IRFCardReader.Stub.asInterface(this.devServ.getRFCardReader());
        } catch (RemoteException e) {
            e.printStackTrace();
            return null;
        }
    }

    public IScanner getScanner() {
        try {
            return IScanner.Stub.asInterface(this.devServ.getScanner(0));
        } catch (RemoteException e) {
            e.printStackTrace();
            return null;
        }
    }

    public ISystemManager getSystemManager() {
        try {
            return ISystemManager.Stub.asInterface(this.devServ.getSystemManager());
        } catch (RemoteException e) {
            e.printStackTrace();
            return null;
        }
    }

    public ISerialPort getSerialPort() {
        try {
            return ISerialPort.Stub.asInterface(this.devServ.getSerialPort());
        } catch (RemoteException e) {
            e.printStackTrace();
            return null;
        }
    }

    public ISIM4442CardReader getSle4442() {
        try {
            return ISIM4442CardReader.Stub.asInterface(this.devServ.getSim4442CardReader());
        } catch (RemoteException e) {
            e.printStackTrace();
            return null;
        }
    }

    public ISIM4428CardReader getSle4428() {
        try {
            return ISIM4428CardReader.Stub.asInterface(this.devServ.getSim4428CardReader());
        } catch (RemoteException e) {
            throw new RuntimeException(e);
        }
    }

    public IAppManager iAppManager() {
        try {
            return IAppManager.Stub.asInterface(this.devServ.getAppManager());
        } catch (RemoteException e) {
            throw new RuntimeException(e);
        }
    }

    public IPsamReader getPsam() {
        try {
            return IPsamReader.Stub.asInterface(this.devServ.getPsamCardReader(null));
        } catch (RemoteException e) {
            throw new RuntimeException(e);
        }
    }

    public IFinger getFinger() {
        try {
            return IFinger.Stub.asInterface(this.devServ.getIFinger(null));
        } catch (RemoteException e) {
            throw new RuntimeException(e);
        }
    }

    public IAT24CxxCardReader getAt24Cxx() {
        try {
            return IAT24CxxCardReader.Stub.asInterface(this.devServ.getAt24xxCardReader());
        } catch (RemoteException e) {
            throw new RuntimeException(e);
        }
    }

    public IAT1604CardReader getAt1604() {
        try {
            return IAT1604CardReader.Stub.asInterface(this.devServ.getAt1604CardReader());
        } catch (RemoteException e) {
            throw new RuntimeException(e);
        }
    }

    public IAT1608CardReader getAt1608() {
        try {
            return IAT1608CardReader.Stub.asInterface(this.devServ.getAt1608CardReader());
        } catch (RemoteException e) {
            throw new RuntimeException(e);
        }
    }

    public ISIM4442CardReader getSim4442() {
        try {
            return ISIM4442CardReader.Stub.asInterface(this.devServ.getSim4442CardReader());
        } catch (RemoteException e) {
            throw new RuntimeException(e);
        }
    }

    public ISIM4428CardReader getSim4428() {
        try {
            return ISIM4428CardReader.Stub.asInterface(this.devServ.getSim4428CardReader());
        } catch (RemoteException e) {
            throw new RuntimeException(e);
        }
    }

    public IAppManager getAppManager() {
        try {
            return IAppManager.Stub.asInterface(this.devServ.getAppManager());
        } catch (RemoteException e) {
            throw new RuntimeException(e);
        }
    }

    public IGuestDisplayManager getGuestDisplayManager() {
        try {
            return IGuestDisplayManager.Stub.asInterface(this.devServ.getGuestDisplayManager());
        } catch (RemoteException e) {
            throw new RuntimeException(e);
        }
    }
}
