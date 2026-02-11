package com.sunyard.sdkserviceinvokedemo;

import androidx.appcompat.app.AppCompatActivity;

import android.os.Bundle;
import android.os.RemoteException;
import android.text.TextUtils;
import android.util.Log;

import com.sunyard.api.rfreader.OnRfListener;
import com.sunyard.api.rfreader.RfConstant;
import com.sunyard.sdkserviceinvokedemo.databinding.ActivityM1CardBinding;
import com.sunyard.sdkserviceinvokedemo.service.DeviceServiceGet;
import com.sunyard.sdkserviceinvokedemo.util.StringUtil;

import java.util.Arrays;

public class M1CardActivity extends AppCompatActivity {

    ActivityM1CardBinding binding;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityM1CardBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        initView();
    }

    private void initView() {
        binding.btReadCard.setOnClickListener(view -> {
            waitM1Card();
        });
        binding.btAuthCard.setOnClickListener(view -> {
            byte[] pwd = new byte[6];
            Arrays.fill(pwd, (byte) 0xFF);
            try {
                int ret = DeviceServiceGet.getInstance().getRFCardReader().authBlock(4, 0, pwd);
                setResult("m1 auth ret:" + ret);
            } catch (RemoteException e) {
                e.printStackTrace();
                setResult("m1 auth error");
            }
        });
        binding.btReadBlock.setOnClickListener(view -> {
            byte[] buffer = new byte[16];
            try {
                int ret = DeviceServiceGet.getInstance().getRFCardReader().readBlock(4, buffer);
                setResult("m1 read ret:" + ret + ",buffer:" + StringUtil.byte2HexStr(buffer));
            } catch (RemoteException e) {
                e.printStackTrace();
                setResult("m1 read error");
            }
        });
        binding.btWriteBlock.setOnClickListener(view -> {
            byte[] buffer = new byte[16];
            Arrays.fill(buffer,(byte) 0xF1);
            //buffer[3] = (byte) 0xF1;
            setResult("buffer:" + StringUtil.byte2HexStr(buffer));
            try {
                int ret = DeviceServiceGet.getInstance().getRFCardReader().writeBlock(4, buffer);
                setResult("m1 write ret:" + ret);
            } catch (RemoteException e) {
                e.printStackTrace();
                setResult("m1 write error");
            }
        });
        binding.btIncrease.setOnClickListener(view -> {
            try {
                int ret = DeviceServiceGet.getInstance().getRFCardReader().increaseValue(4, 1);
                setResult("m1 increase ret:" + ret);
            } catch (RemoteException e) {
                e.printStackTrace();
                setResult("m1 write error");
            }
        });
        binding.btDecrease.setOnClickListener(view -> {
            try {
                int ret = DeviceServiceGet.getInstance().getRFCardReader().decreaseValue(4, 1);
                setResult("m1 decrease ret:" + ret);
            } catch (RemoteException e) {
                e.printStackTrace();
                setResult("m1 write error");
            }
        });
    }

    private void waitM1Card() {
        try {
            DeviceServiceGet.getInstance().getRFCardReader().waitRFCard(new OnRfListener.Stub() {
                @Override
                public void onCardPass(int type) throws RemoteException {
                    if (type == RfConstant.CardType.S50_CARD || type == RfConstant.CardType.S70_CARD) {
                        setResult("detect the m1 card successful");
                        byte[] response = new byte[20];
                        int ret = DeviceServiceGet.getInstance().getRFCardReader().activateCard(RfConstant.CardDriver.M1, response);
                        Log.e("test", "response:" + StringUtil.byte2HexStr(response));
                        if (ret == 0) {
                            byte[] attribute = new byte[response[0]];
                            System.arraycopy(response, 1, attribute, 0, response[0]);
                            Log.e("test", "attribute:" + StringUtil.byte2HexStr(attribute));
                            setResult("attribute:" + StringUtil.byte2HexStr(attribute));
                        }
                    } else {
                        setResult("detect the other card,not the m1 card");
                    }
                }

                @Override
                public void onFail(int i, String s) throws RemoteException {
                    setResult("detect error," + i + "," + s);
                }
            });
        } catch (RemoteException e) {
            e.printStackTrace();
        }
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

    /**
     * @param type 0:A password; 1:B password
     */
    private void modifyPwd(int type) {
        byte[] buffer = new byte[16];
        try {
            int ret = DeviceServiceGet.getInstance().getRFCardReader().readBlock(7, buffer);
            setResult("m1 read ret:" + ret + ",buffer:" + StringUtil.byte2HexStr(buffer));
            byte[] bp = new byte[16];
            Arrays.fill(bp, (byte) 0xFF);
            if (type == 0) {
                System.arraycopy(buffer, 6, bp, 6, 10);
            } else {
                System.arraycopy(buffer, 0, bp, 0, 10);
            }
            Log.e("test", "bp:" + StringUtil.byte2HexStr(bp));
            ret = DeviceServiceGet.getInstance().getRFCardReader().writeBlock(7, bp);
            setResult("m1 write ret:" + ret);
        } catch (RemoteException e) {
            e.printStackTrace();
            setResult("m1 read error");
        }
    }
}