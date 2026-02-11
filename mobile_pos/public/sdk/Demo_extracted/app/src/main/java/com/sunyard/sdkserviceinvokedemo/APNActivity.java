package com.sunyard.sdkserviceinvokedemo;

import androidx.appcompat.app.AppCompatActivity;

import android.os.Bundle;
import android.os.RemoteException;
import android.text.TextUtils;

import com.sunyard.api.system.APN;
import com.sunyard.sdkserviceinvokedemo.databinding.ActivityApnBinding;
import com.sunyard.sdkserviceinvokedemo.service.DeviceServiceGet;

import java.util.List;

public class APNActivity extends AppCompatActivity {

    ActivityApnBinding binding;
    private List<APN> apnList = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityApnBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        binding.btGetApnList.setOnClickListener(view -> {

            try {
                apnList = DeviceServiceGet.getInstance().getSystemManager().getApnList();
                setResult("ApnList.size:" + apnList.size());
                /*if (apnList.size() > 0) {
                    for (APN apn : apnList) {
                        setResult("{" + apn.getId() + "," + apn.getApn() + "," + apn.getType());
                    }
                }*/
            } catch (RemoteException e) {
                e.printStackTrace();
                setResult("getApnList error");
            }
        });
        binding.btAddApn.setOnClickListener(view -> {
            try {
                APN apn = new APN();
                apn.setName("test01");
                apn.setApn("apn_test_01");
                apn.setUser("user01");
                apn.setPassword("123456");
                apn.setAuthtype(0);
                boolean ret = DeviceServiceGet.getInstance().getSystemManager().addApn(apn);
                setResult("addApn:" + ret);
            } catch (RemoteException e) {
                e.printStackTrace();
                setResult("addApn error");
            }
        });
        binding.btGetCurrentApn.setOnClickListener(view -> {
            try {
                APN apn = DeviceServiceGet.getInstance().getSystemManager().getCurrentApn();
                setResult(apn != null ? ("currentApn:{" + apn.getId() + "," + apn.getApn() + "," + apn.getType()) + "}" : "currentApn:null");
            } catch (RemoteException e) {
                e.printStackTrace();
                setResult("getCurrentApn error");
            }
        });
        binding.btSwitchApn.setOnClickListener(view -> {
            try {
                int ret = DeviceServiceGet.getInstance().getSystemManager().switchApn("apn_test_01", "user01", "123456");
                setResult("switchApn ret:" + ret);
            } catch (RemoteException e) {
                e.printStackTrace();
                setResult("switchApn error");
            }
        });
        binding.btRemoveApn.setOnClickListener(view -> {
            if (apnList != null && apnList.size() > 0) {
                try {
                    String id = apnList.get(apnList.size() - 1).getId();
                    boolean ret = DeviceServiceGet.getInstance().getSystemManager().removeApn(id);
                    setResult("removeApn ret:" + ret);
                } catch (RemoteException e) {
                    e.printStackTrace();
                    setResult("removeApn error");
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