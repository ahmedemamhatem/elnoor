package com.sunyard.sdkserviceinvokedemo;

import androidx.appcompat.app.AppCompatActivity;

import android.os.Bundle;
import android.os.RemoteException;
import android.text.TextUtils;

import com.sunyard.api.data.BytesValue;
import com.sunyard.api.psam.ApduCmd;
import com.sunyard.api.psam.IPsamReader;
import com.sunyard.sdkserviceinvokedemo.databinding.ActivityPsamBinding;
import com.sunyard.sdkserviceinvokedemo.service.DeviceServiceGet;
import com.sunyard.sdkserviceinvokedemo.util.StringUtil;

public class PsamActivity extends AppCompatActivity {
    ActivityPsamBinding binding;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityPsamBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        binding.btCardIn.setOnClickListener(view -> {
            try {
                boolean ret = DeviceServiceGet.getInstance().getPsam().isCardIn();
                setResult("isCardIn ->" + ret);
            } catch (RemoteException e) {
                e.printStackTrace();
            }
        });
        binding.btPowerUp.setOnClickListener(view -> {
            try {
                BytesValue atr = new BytesValue();
                boolean ret = DeviceServiceGet.getInstance().getPsam().powerUp(Integer.parseInt(binding.etSlot.getText().toString()), atr);
                setResult("powerUp->" + ret + ", atr->" + StringUtil.byte2HexStr(atr.getData()));
            } catch (RemoteException e) {
                e.printStackTrace();
            }
        });
        binding.btPowerDown.setOnClickListener(view -> {
            try {
                boolean ret = DeviceServiceGet.getInstance().getPsam().powerDown();
                setResult("powerDown->" + ret);
            } catch (RemoteException e) {
                e.printStackTrace();
            }
        });
        binding.btExchangeApdu.setOnClickListener(view -> {
            try {
                byte[] adpu = StringUtil.hexString2Bytes("00A40000023F00");
                ApduCmd cmd = new ApduCmd();
                int ret = DeviceServiceGet.getInstance().getPsam().exchangeApdu(adpu, cmd);
                setResult("exchangeApdu->" + ret + ", sw->" + StringUtil.byte2HexStr(cmd.getCmdSw())
                        + ",data:" + StringUtil.byte2HexStr(cmd.getDataOut()));
            } catch (RemoteException e) {
                e.printStackTrace();
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