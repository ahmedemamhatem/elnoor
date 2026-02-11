package com.sunyard.sdkserviceinvokedemo.util;

import android.os.RemoteException;
import android.util.Log;

import com.sunyard.api.serialport.ISerialPort;
import com.sunyard.api.serialport.SerialConstant;
import com.sunyard.sdkserviceinvokedemo.service.DeviceServiceGet;

public class SerialPortUtil {

    private static ISerialPort serialPort;

    public static boolean openSerialPort() {
        count = 1;
        serialPort = DeviceServiceGet.getInstance().getSerialPort();
        boolean ret;
        try {
            ret = serialPort.init(SerialConstant.BPS.BPS_115200, 0, 8);
            if (ret) {
                ret = serialPort.open();
            }
        } catch (RemoteException e) {
            e.printStackTrace();
            ret = false;
        }
        return ret;
    }

    public static boolean closeSerialPort() {
        boolean ret;
        try {
            ret = serialPort.close();
        } catch (Exception e) {
            e.printStackTrace();
            ret = false;
        }
        return ret;
    }

    public static boolean isInputBufferEmpty() {
        try {
            return serialPort.isBufferEmpty(true);
        } catch (RemoteException e) {
        }
        return false;
    }

    public static boolean isOutputBufferEmpty() {
        try {
            return serialPort.isBufferEmpty(false);
        } catch (RemoteException e) {
        }
        return false;
    }

    public static boolean clearInputBuffer(){
        try {
            return serialPort.clearInputBuffer();
        } catch (RemoteException e) {
        }
        return false;
    }

    public static int readSerialPort() {
        try {
            byte[] buffer = new byte[1024];
            //timeout - 0: No overtime time, will read until read data ; others:Read the timeout period, in milliseconds.
            //int len = serialPort.read(buffer, 0);
            int len = serialPort.read(buffer, 3000);
            if (len > 0) {
                Log.e("readSerialPort", StringUtil.byte2HexStr(buffer));
                byte[] data = new byte[len];
                System.arraycopy(buffer, 0, data, 0, len);
                Log.e("readSerialPort", "" + StringUtil.byte2HexStr(data));
            }
            return len;
        } catch (RemoteException e) {
            e.printStackTrace();
        }
        return -1;
    }

    private static int count = 0;

    public static int writeSerialPort() {
        count++;
        try {
            long a = 10000000 + count;
            byte[] buffer = StringUtil.hexString2Bytes("" + a);
            int len = serialPort.write(buffer, 1000);
            return len;
        } catch (RemoteException e) {
            e.printStackTrace();
        }
        return -1;
    }

}
