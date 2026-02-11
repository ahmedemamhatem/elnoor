package com.sunyard.sdkserviceinvokedemo;

import androidx.appcompat.app.AppCompatActivity;

import android.content.Intent;
import android.os.Bundle;
import android.os.RemoteException;
import android.text.TextUtils;
import android.util.Log;

import com.sunyard.api.pinpad.OnInputPinListener;
import com.sunyard.api.pinpad.PedConstant;
import com.sunyard.sdkserviceinvokedemo.databinding.ActivityPedBinding;
import com.sunyard.sdkserviceinvokedemo.service.DeviceServiceGet;
import com.sunyard.sdkserviceinvokedemo.util.StringUtil;


public class PedActivity extends AppCompatActivity {

    ActivityPedBinding binding;
    private final String TAG = "PedActivity_SYD";
    private String testCardNo = "0000123456781234";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityPedBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        binding.btResetPed.setOnClickListener(view -> {
            resetPed();
        });
        binding.btWriteMkey.setOnClickListener(view -> {
            writeMKey();
            //writeTEK_tr31();
            //writeTMK_1();
        });
        binding.btWriteWkey.setOnClickListener(view -> {
            writeWkey();
        });
        binding.btGetKcv.setOnClickListener(view -> {
            getKcv();
        });
        binding.btStartPin.setOnClickListener(view -> {
            startPinInput();
        });
        binding.btLoadTr31.setOnClickListener(view -> {

//            loadTEK_tr31();
//            loadTmkTr31();

            loadTMK_1();
            loadWkey_tr31();
        });

        binding.btCustomizePin.setOnClickListener(view -> {
            Intent intent = new Intent(PedActivity.this, CustomizePinActivity.class);
            intent.putExtra("keyIndex", 2);
            intent.putExtra("isDukpt", false);
            intent.putExtra("isOnline", true);//if you want enter offline pin, set this to false.
            intent.putExtra("isKeyRandom", false);//if you want to random key num, set this to true.
            int mode = PedConstant.PinAlgorithm.ISO9564_FORMAT_0;
            intent.putExtra("mode", mode);
            intent.putExtra("cardNo", testCardNo);
            startActivity(intent);
        });
    }

    private void resetPed() {
        try {
            boolean ret = DeviceServiceGet.getInstance().getPinpad().reset();
            setResult("ped reset " + (ret ? "successful" : "failure"));
        } catch (RemoteException e) {
            e.printStackTrace();
            setResult("ped reset exception");
        }
    }

    private void writeMKey() {
        try {
            boolean ret = DeviceServiceGet.getInstance().getPinpad().loadMainKey(1, 1,
                    StringUtil.hexString2Bytes(Constant.PED_TMK),
                    null
                    //StringUtil.hexString2Bytes(Constant.PED_TMK_KCV)
            );
            Log.d(TAG, "load main key->" + ret);
            setResult("load mainkey " + (ret ? "successful" : "failure"));
        } catch (RemoteException e) {
            e.printStackTrace();
            setResult("load main key exception");
        }
    }

    private void writeWkey() {
        try {
            boolean ret = DeviceServiceGet.getInstance().getPinpad().loadWorkKey(PedConstant.KeyType.MAC_KEY, 1, 1,
                    StringUtil.hexString2Bytes(Constant.PED_TAK),
                    //null
                    StringUtil.hexString2Bytes(Constant.PED_TAK_KCV)
            );
            Log.d(TAG, "load TAK ->" + ret);
            setResult("load TAK key " + (ret ? "successful" : "failure"));
            ret = DeviceServiceGet.getInstance().getPinpad().loadWorkKey(PedConstant.KeyType.PIN_KEY, 1, 2,
                    StringUtil.hexString2Bytes(Constant.PED_TPK),
                    //null
                    StringUtil.hexString2Bytes(Constant.PED_TPK_KCV)
            );
            Log.d(TAG, "load TPK->" + ret);
            setResult("load TPK " + (ret ? "successful" : "failure"));
            ret = DeviceServiceGet.getInstance().getPinpad().loadWorkKey(PedConstant.KeyType.TD_KEY, 1, 3,
                    StringUtil.hexString2Bytes(Constant.PED_TDK),
                    //null
                    StringUtil.hexString2Bytes(Constant.PED_TDK_KCV)
            );
            Log.d(TAG, "load TDK->" + ret);
            setResult("load TDK " + (ret ? "successful" : "failure"));
            ret = DeviceServiceGet.getInstance().getPinpad().loadWorkKey(PedConstant.KeyType.ENCDEC_KEY, 1, 4,
                    StringUtil.hexString2Bytes(Constant.PED_ENCODE_WK),
                    //null
                    StringUtil.hexString2Bytes(Constant.PED_ENCODE_WK_KCV)
            );
            Log.d(TAG, "load ENCDEC key->" + ret);
            setResult("load ENCDEC key " + (ret ? "successful" : "failure"));
        } catch (RemoteException e) {
            e.printStackTrace();
            setResult("load work key exception");
        }
    }

    private void getKcv() {
        try {
            byte[] kcv = DeviceServiceGet.getInstance().getPinpad().getKcv(PedConstant.KeyType.MAIN_KEY, 1);
            setResult("masterkey kcv:" + (kcv == null ? "null" : StringUtil.byte2HexStr(kcv)));
            kcv = DeviceServiceGet.getInstance().getPinpad().getKcv(PedConstant.KeyType.MAC_KEY, 1);
            setResult("mackey kcv:" + (kcv == null ? "null" : StringUtil.byte2HexStr(kcv)));
            kcv = DeviceServiceGet.getInstance().getPinpad().getKcv(PedConstant.KeyType.PIN_KEY, 2);
            setResult("pinkey kcv:" + (kcv == null ? "null" : StringUtil.byte2HexStr(kcv)));
            kcv = DeviceServiceGet.getInstance().getPinpad().getKcv(PedConstant.KeyType.TD_KEY, 3);
            setResult("tdk kcv:" + (kcv == null ? "null" : StringUtil.byte2HexStr(kcv)));
            kcv = DeviceServiceGet.getInstance().getPinpad().getKcv(PedConstant.KeyType.ENCDEC_KEY, 4);
            setResult("encdecKey kcv:" + (kcv == null ? "null" : StringUtil.byte2HexStr(kcv)));
        } catch (RemoteException e) {
            e.printStackTrace();
        }
    }

    private void startPinInput() {
        setResult("===>startPinInput");
        Bundle pinBundle = new Bundle();
        pinBundle.putBoolean("isOnline", true);
        //byte[] pan = Convert.strToBcdBytes(cardNo, true);
        pinBundle.putByteArray("panBlock", testCardNo.getBytes());
        pinBundle.putByteArray("pinLimit", new byte[]{0x00, 0x04, 0x06});
        pinBundle.putInt("timeout", 60);
        pinBundle.putBoolean("isKeyRandom", true);//false:num keys random arrangement
        pinBundle.putInt("mode", PedConstant.PinAlgorithm.ISO9564_FORMAT_0);
        //pinBundle.putString("prompt", "Please enter the card password");
        pinBundle.putBoolean("encrypted", true);
        //pinBundle.putBoolean("show_pwd_inputting", true);
        //pinBundle.putBoolean("show_promptString", true);
        try {
            DeviceServiceGet.getInstance().getPinpad().startPinInput(2, pinBundle, pinListener);
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

    OnInputPinListener pinListener = new OnInputPinListener.Stub() {
        @Override
        public void onCancel() throws RemoteException {
            Log.d(TAG, "onCancel-->");
            setResult("pin onCancel");
        }

        @Override
        public void onConfirm(byte[] pinResult, boolean isNonePin) throws RemoteException {
            Log.d(TAG, "onConfirm-->" + isNonePin);
            setResult("pin onConfirm,  isNonePin:" + isNonePin);
            if (pinResult == null && isNonePin) {
                Log.d(TAG, "bypass is null");
            } else {
                setResult("pin onConfirm pinResult:" + StringUtil.byte2HexStr(pinResult));
                Log.d(TAG, "pinResult is not null");
            }
        }

        @Override
        public void onError(int ret) throws RemoteException {
            //error same as cancel
            setResult("pin onError, ret:" + ret);
        }

        @Override
        public void onInput(int i, int i1) throws RemoteException {
            setResult("pin onInput, " + i + ", " + i1);
        }
    };


    private void loadTEK_tr31() {
        try {
            boolean ret = DeviceServiceGet.getInstance().getPinpad().loadTEK(
                    StringUtil.hexString2Bytes(Constant.PED_TR31_TLK), 0,
                    StringUtil.hexString2Bytes(Constant.PED_TR31_TLK_KCV));
            Log.d(TAG, "load tek->" + ret);
            setResult("load tek " + (ret ? "successful" : "failure"));
        } catch (RemoteException e) {
            e.printStackTrace();
            setResult("load tek exception");
        }
    }

    private void loadTmkTr31() {
        boolean ret = false;
        try {
            ret = DeviceServiceGet.getInstance().getPinpad().loadTr31Key(1, PedConstant.KeyType.MAIN_KEY, 0, PedConstant.KeyType.PED_TEK, StringUtil.hexString2Bytes(Constant.PED_TR31_KEYBLOCK));
        } catch (RemoteException e) {
            e.printStackTrace();
        }
        setResult("load tmk Tr31:" + ret);
    }

    private void loadTMK_1() {
        try {
            boolean ret = DeviceServiceGet.getInstance().getPinpad().loadMainKey(1, 1,
                    StringUtil.hexString2Bytes(Constant.PED_TR31_TLK),
                    StringUtil.hexString2Bytes(Constant.PED_TR31_TLK_KCV));
            Log.d(TAG, "load tmk->" + ret);
            setResult("load tmk " + (ret ? "successful" : "failure"));
        } catch (RemoteException e) {
            e.printStackTrace();
            setResult("load tmk exception");
        }
    }

    private void loadWkey_tr31() {
        try {
            boolean ret = DeviceServiceGet.getInstance().getPinpad().loadTr31Key(1, PedConstant.KeyType.MAC_KEY,
                    1, PedConstant.KeyType.MAIN_KEY,
                    StringUtil.hexString2Bytes(Constant.PED_TR31_KEYBLOCK)
            );
            Log.d(TAG, "load tr31 TAK ->" + ret);
            setResult("load tr31 TAK key " + (ret ? "successful" : "failure"));

            /*boolean ret = DeviceServiceGet.getInstance().getPinpad().loadTr31Key(2, PedConstant.KeyType.PIN_KEY,
                    1, PedConstant.KeyType.MAIN_KEY,
                    StringUtil.hexString2Bytes(Constant.PED_TR31_KEYBLOCK)
            );
            Log.d(TAG, "load tr31 TPK->" + ret);
            setResult("load tr31 TPK " + (ret ? "successful" : "failure"));*/

            /*boolean ret = DeviceServiceGet.getInstance().getPinpad().loadTr31Key(3, PedConstant.KeyType.TD_KEY,
                    1, PedConstant.KeyType.MAIN_KEY,
                    StringUtil.hexString2Bytes(Constant.PED_TR31_KEYBLOCK)
            );
            Log.d(TAG, "load tr31 TDK->" + ret);
            setResult("load tr31 TDK " + (ret ? "successful" : "failure"));*/

            /*boolean ret = DeviceServiceGet.getInstance().getPinpad().loadTr31Key(4, PedConstant.KeyType.ENCDEC_KEY,
                    1, PedConstant.KeyType.MAIN_KEY,
                    StringUtil.hexString2Bytes(Constant.PED_TR31_KEYBLOCK)
            );
            Log.d(TAG, "load tr31 ENCDEC key->" + ret);
            setResult("load tr31 ENCDEC key " + (ret ? "successful" : "failure"));*/
        } catch (RemoteException e) {
            e.printStackTrace();
            setResult("load work key exception");
        }
    }
}