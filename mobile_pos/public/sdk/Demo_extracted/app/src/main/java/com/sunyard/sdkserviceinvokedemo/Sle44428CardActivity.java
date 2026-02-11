package com.sunyard.sdkserviceinvokedemo;

import androidx.appcompat.app.AppCompatActivity;

import android.app.ProgressDialog;
import android.os.Bundle;
import android.os.Environment;
import android.os.RemoteException;
import android.os.SystemClock;
import android.text.TextUtils;
import android.util.Log;

import com.sunyard.api.constant.SyncCardConstant;
import com.sunyard.api.data.BytesValue;
import com.sunyard.api.data.IntValue;
import com.sunyard.sdkserviceinvokedemo.databinding.ActivitySle4428cardBinding;
import com.sunyard.sdkserviceinvokedemo.service.DeviceServiceGet;
import com.sunyard.sdkserviceinvokedemo.util.StringUtil;

import java.util.Arrays;

public class Sle44428CardActivity extends AppCompatActivity {
    ActivitySle4428cardBinding binding;
    private final String TAG = "Sle4442Activity";
    DeviceServiceGet deviceServiceGet;
    ProgressDialog dialog;
    StringBuffer buffer;
    private boolean search = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivitySle4428cardBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        deviceServiceGet = (DeviceServiceGet) DeviceServiceGet.getInstance();
        initView();
    }

    private void initView() {
        binding.btReadCard.setOnClickListener(v -> {
            readCard();
        });
        binding.btWriteCard.setOnClickListener(v -> {
            writeData();
        });
        binding.btCheckKey.setOnClickListener(view -> {
            checkKey(0x20, (byte) 0x20);
        });
        binding.btChangeKey.setOnClickListener(view -> {
//            changeKey(new byte[]{(byte) 0xff, (byte) 0xff}, new byte[]{(byte) 0x11, (byte) 0x11});
//            changeKey(new byte[]{(byte) 0x11, (byte) 0x11}, new byte[]{(byte) 0xff, (byte) 0xff});
        });
        binding.btOthers.setOnClickListener(view -> {
            buffer = new StringBuffer();
            try {
                boolean exit = deviceServiceGet.getSle4428().exist();
                buffer.append("exit:" + exit + "\n");
                boolean powerRet = deviceServiceGet.getSle4428().powerUp(0, new BytesValue());
                buffer.append("powerRet:" + powerRet + "\n");
                if (powerRet) {
                    IntValue intValue = new IntValue();
                    int ret = deviceServiceGet.getSle4428().verify(new byte[]{(byte) 0xff, (byte) 0xff}, intValue);
                    Log.d(TAG, "verify: " + ret + ", errCount: " + intValue.getData());
                    buffer.append("verify:" + ret + "\n");
                    if (0 == ret) {
                        IntValue sta = new IntValue();
                        ret = deviceServiceGet.getSle4428().readStatus(34, sta);
                        buffer.append("read status ret = " + ret + ", sta:" + sta.getData() + "\n");
                        Log.d(TAG, "read status ret = " + ret + ", sta:" + sta.getData() + "\n");
                    }
                    IntValue errCount = new IntValue();
                    ret = deviceServiceGet.getSle4428().readErrorCount(errCount);
                    buffer.append("read errCount ret = " + ret + ", count:" + errCount.getData() + "\n");
                    Log.d(TAG, "read errCount ret = " + ret + ", count:" + errCount.getData() + "\n");
                }
                deviceServiceGet.getSle4428().powerDown();
            } catch (RemoteException e) {
                e.printStackTrace();
            }
            setResult(buffer.toString());
        });
    }

    /**
     * check key will set the data of the specified address to disabled.
     *
     * @param address
     * @param data
     */
    private void checkKey(int address, byte data) {
        buffer = new StringBuffer();
        try {
            boolean powerRet = deviceServiceGet.getSle4428().powerUp(0, new BytesValue());
            buffer.append("powerRet:" + powerRet + "\n");
            if (powerRet) {
                IntValue intValue = new IntValue();
                int ret = deviceServiceGet.getSle4428().verify(new byte[]{(byte) 0xff, (byte) 0xff}, intValue);
                Log.d(TAG, "verify: " + ret + ", errCount: " + intValue.getData());
                buffer.append("verify:" + ret + "\n");
                if (0 == ret) {
                    ret = deviceServiceGet.getSle4428().checkData(address, data);
                    buffer.append("getSle4428 check ret = " + ret + "\n");
                    Log.d(TAG, "getSle4428 check ret: " + ret);
                }
            }
            deviceServiceGet.getSle4428().powerDown();
        } catch (RemoteException e) {
            e.printStackTrace();
        }
        setResult(buffer.toString());
    }

    private void changeKey(byte[] oldPwd, byte[] newPwd) {
        buffer = new StringBuffer();
        try {
            boolean powerRet = deviceServiceGet.getSle4428().powerUp(0, new BytesValue());
            buffer.append("powerRet:" + powerRet + "\n");
            if (powerRet) {
                IntValue intValue = new IntValue();
                int ret = deviceServiceGet.getSle4428().verify(oldPwd, intValue);
                Log.d(TAG, "likn verify: " + ret + ", errcount: " + intValue.getData());
                buffer.append("verify:" + ret + "\n");
                if (0 == ret) {
                    ret = deviceServiceGet.getSle4428().changeKey(newPwd);
                    buffer.append("change key ret = " + ret);
                    Log.d(TAG, "change key ret = " + ret + "\n");
                }
            }
            deviceServiceGet.getSle4428().powerDown();
        } catch (RemoteException e) {
            e.printStackTrace();
        }
        setResult(buffer.toString());
    }

    private void readCard() {
        buffer = new StringBuffer();
        try {
            BytesValue atr = new BytesValue();
            boolean powerRet = deviceServiceGet.getSle4428().powerUp(0, atr);
            buffer.append("powerRet:" + powerRet + "\n");
            if (powerRet) {
                buffer.append("atr:" + (atr.getData() == null ? "null" : StringUtil.byte2HexStr(atr.getData())) + "\n");
                //read
                BytesValue data = new BytesValue();
                int ret = deviceServiceGet.getSle4428().read(0, 1024, data);
                Log.d(TAG, "getSle4428 read ret = " + ret);
                buffer.append("getSle4428 read ret：" + ret + "\n");
                if (ret == 0) {
                    Log.d(TAG, "getSle4428 read length = " + data.getData().length + ", data = " + StringUtil.byte2HexStr(data.getData()));
                    buffer.append("getSle4428 read length = " + data.getData().length + ", data = " + StringUtil.byte2HexStr(data.getData()) + "\n");
                }
            }
            deviceServiceGet.getSle4428().powerDown();
        } catch (RemoteException e) {
            e.printStackTrace();
        }
        setResult(buffer.toString());
    }

    private void writeData() {
        buffer = new StringBuffer();
        try {
            BytesValue atr = new BytesValue();
            boolean powerRet = deviceServiceGet.getSle4428().powerUp(0, atr);
            buffer.append("powerRet:" + powerRet + "\n");
            if (powerRet) {
                IntValue intValue = new IntValue();
                int ret = deviceServiceGet.getSle4428().verify(new byte[]{(byte) 0xff, (byte) 0xff}, intValue);
                Log.d(TAG, "verify: " + ret + ", errCount: " + intValue.getData());
                buffer.append("verify:" + ret + "\n");
                if (0 == ret) {
                    byte[] writeData = new byte[10];
                    Arrays.fill(writeData, (byte) 0xf2);
//                    writeData[0] = 0x20;
//                    writeData[1] = 0x21;
//                    writeData[2] = 0x22;
                    BytesValue data = new BytesValue();
                    ret = deviceServiceGet.getSle4428().read(0x20, 10, data);
                    buffer.append("getSle4428 read data").append(StringUtil.byte2HexStr(data.getData())).append("\n");
                    ret = deviceServiceGet.getSle4428().write(SyncCardConstant.SIM4428WriteMode.MODE_ENABLE, 0x20, writeData);
                    buffer.append("getSle4428 write ret = " + ret + "\n");
                    Log.d(TAG, "getSle4428 write ret: " + ret);
                    ret = deviceServiceGet.getSle4428().read(0x20, 10, data);
                    buffer.append("getSle4428 read data").append(StringUtil.byte2HexStr(data.getData())).append("\n");
                }
            }
            deviceServiceGet.getSle4428().powerDown();
        } catch (RemoteException e) {
            e.printStackTrace();
        }
        setResult(buffer.toString());
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
                dialog = new ProgressDialog(Sle44428CardActivity.this);
                dialog.setMessage(message);
                dialog.setIndeterminate(true);
                dialog.setCancelable(false);
                dialog.show();
            }
        });
    }

    private void setResult(String res) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
//                String result = binding.tvResult.getText().toString();
//                if (!TextUtils.isEmpty(result)) {
//                    result += "\n";
//                }
//                result += res;
                binding.tvResult.setText(res);
            }
        });
    }
}