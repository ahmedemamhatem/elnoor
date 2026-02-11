package com.sunyard.sdkserviceinvokedemo;

import androidx.appcompat.app.AppCompatActivity;

import android.os.Bundle;
import android.os.RemoteException;
import android.text.TextUtils;
import android.view.View;

import com.sunyard.sdkserviceinvokedemo.databinding.ActivityGeneralBinding;
import com.sunyard.sdkserviceinvokedemo.service.DeviceServiceGet;

import java.util.TimeZone;

public class GeneralActivity extends AppCompatActivity {

    ActivityGeneralBinding binding;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityGeneralBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        binding.btGetSn.setOnClickListener(view -> {
            String sn = null;
            try {
                sn = DeviceServiceGet.getInstance().getDeviceInfo().getSerialNo();
            } catch (RemoteException e) {
                e.printStackTrace();
            }
            setResult(TextUtils.isEmpty(sn) ? "SerialNo is null" : "SerialNo:" + sn);
        });
        binding.btHomeDisable.setOnClickListener(view -> {
            try {
                int ret = DeviceServiceGet.getInstance().getSystemManager().setHomeKeyDisable(true);
            } catch (RemoteException e) {
                e.printStackTrace();
            }
            setResult("check whether the home key disabled");
        });
        binding.btHomeEnable.setOnClickListener(view -> {
            try {
                int ret = DeviceServiceGet.getInstance().getSystemManager().setHomeKeyDisable(false);
                //DeviceServiceGet.getInstance().getSystemManager().setBackKeyDisable(false);
                //DeviceServiceGet.getInstance().getSystemManager().setStatusBarDisable(false);
            } catch (RemoteException e) {
                e.printStackTrace();
            }
            setResult("check whether the home key enabled");
        });
        binding.btRecentDisable.setOnClickListener(view -> {
            try {
                int ret = DeviceServiceGet.getInstance().getSystemManager().setRecentKeyDisable(true);
            } catch (RemoteException e) {
                e.printStackTrace();
            }
            setResult("check whether the recent key disabled");
        });
        binding.btRecentEnable.setOnClickListener(view -> {
            try {
                int ret = DeviceServiceGet.getInstance().getSystemManager().setRecentKeyDisable(false);
            } catch (RemoteException e) {
                e.printStackTrace();
            }
            setResult("check whether the recent key enabled");
        });
        binding.btBeep.setOnClickListener(view -> {
            try {
                DeviceServiceGet.getInstance().getBeeper().startBeep(1000, 500);
            } catch (RemoteException e) {
                e.printStackTrace();
            }
            setResult("check whether the beeper can work.");
        });
        binding.btSetRebootTime.setOnClickListener(view -> {
            try {
                int ret = DeviceServiceGet.getInstance().getSystemManager().setSystemRebootTime("04:00");
                setResult("setSystemRebootTime:" + ret);
            } catch (RemoteException e) {
                e.printStackTrace();
            }
            setResult("check whether the home key disabled");
        });
        binding.btDisableRebootTime.setOnClickListener(view -> {
            try {
                int ret = DeviceServiceGet.getInstance().getSystemManager().setSystemRebootDisable(true);
                setResult("setSystemRebootDisable:" + ret);
            } catch (RemoteException e) {
                e.printStackTrace();
            }
        });
        binding.btOpenWifi.setOnClickListener(view -> {
            try {
                int ret = DeviceServiceGet.getInstance().getSystemManager().setWifiDisable(false);
                setResult("openWifi:" + ret);
            } catch (RemoteException e) {
                e.printStackTrace();
            }
        });
        binding.btCloseWifi.setOnClickListener(view -> {
            try {
                int ret = DeviceServiceGet.getInstance().getSystemManager().setWifiDisable(true);
                setResult("closeWifi:" + ret);
            } catch (RemoteException e) {
                e.printStackTrace();
            }
        });
        binding.btOpenSim.setOnClickListener(view -> {
            try {
                int ret = DeviceServiceGet.getInstance().getSystemManager().setSimNetworkDisable(0, false);
                setResult("openSimNetwork:" + ret);
            } catch (RemoteException e) {
                e.printStackTrace();
            }
        });
        binding.btCloseSim.setOnClickListener(view -> {
            try {
                int ret = DeviceServiceGet.getInstance().getSystemManager().setSimNetworkDisable(0, true);
                setResult("closeSimNetwork:" + ret);
            } catch (RemoteException e) {
                e.printStackTrace();
            }
        });
        binding.btGetNetState.setOnClickListener(view -> {
            try {
                /**
                 *  the result means:
                 *  -1:network is not connected.
                 *  0:wifi is connected.
                 *  1:mobile data is connected.
                 */
                int ret = DeviceServiceGet.getInstance().getSystemManager().getNetworkState();
                setResult("getNetworkState:" + ret);
            } catch (RemoteException e) {
                e.printStackTrace();
            }
        });
        binding.btDisableSettingPwd.setOnClickListener(view -> {
            try {
                DeviceServiceGet.getInstance().getSystemManager().setSysSettingPwdDisable(true);
            } catch (RemoteException e) {
                e.printStackTrace();
            }
        });
        binding.btSetTimezone.setOnClickListener(view -> {
            try {
                DeviceServiceGet.getInstance().getDeviceInfo().setSysTimeZone("America/Los_Angeles");
                //DeviceServiceGet.getInstance().getDeviceInfo().setSysTimeZone("Asia/Shanghai");
            } catch (RemoteException e) {
                e.printStackTrace();
            }
        });
        binding.btGetTimezone.setOnClickListener(view -> {
            try {
                String timeZone = DeviceServiceGet.getInstance().getDeviceInfo().getCurrTimeZone();
                setResult("CurrentTimeZone-->" + timeZone);
            } catch (RemoteException e) {
                e.printStackTrace();
            }
        });
        binding.btIsSunyardDevice.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                try {
                    int isSunyardDevice=DeviceServiceGet.getInstance().getDeviceInfo().isSunYardDevice();
                    setResult("isSunyardDevice-->" + (isSunyardDevice==0?"true":"false"));
                } catch (RemoteException e) {
                    throw new RuntimeException(e);
                }
            }
        });
    }

    private void setResult(String res) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                String result = binding.tvResult.getText().toString();
                if (!TextUtils.isEmpty(result)) {
                    result += "\n";
                }
                result += res;
                binding.tvResult.setText(result);
            }
        });
    }
}