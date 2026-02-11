package com.sunyard.sdkserviceinvokedemo;

import androidx.appcompat.app.AppCompatActivity;

import android.app.ProgressDialog;
import android.os.Bundle;
import android.os.RemoteException;
import android.text.TextUtils;
import android.util.Log;

import com.sunyard.api.emv.EmvConstant;
import com.sunyard.api.emv.IEmv;
import com.sunyard.api.emv.OnEMVHandler;
import com.sunyard.api.emv.OnOnlineResultHandler;
import com.sunyard.api.emv.OnWaitCardListener;
import com.sunyard.api.pinpad.OnInputPinListener;
import com.sunyard.api.pinpad.PedConstant;
import com.sunyard.sdkserviceinvokedemo.databinding.ActivityCardBinding;
import com.sunyard.sdkserviceinvokedemo.service.DeviceServiceGet;
import com.sunyard.sdkserviceinvokedemo.util.StringUtil;
import com.sunyard.sdkserviceinvokedemo.util.TlvUtil;

import java.lang.ref.WeakReference;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Map;

public class CardActivity extends AppCompatActivity {

    ActivityCardBinding binding;
    private static final String TAG = "CardActivity_SYD";
    Bundle inputBundle = null;

    ProgressDialog dialog;

    private String cardNo = "";
    private String CARD_HOLDER_NAME = "";
    private String CARD_SN = "";
    private ReadCardListener readCardListener=new ReadCardListener(this);
    private EmvCardListener emvCardListener=new EmvCardListener(this);
    private MyOnInputPinListener pinListener=new MyOnInputPinListener(this);
    private MyOnEMVHandler onEMVHandler=new MyOnEMVHandler(this);

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityCardBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        binding.btReadCard.setOnClickListener(view -> {
            setResult("start searching card");
            searchCard();
        });
        binding.btWritePed.setOnClickListener(view -> {
            wirteKey();
            try {
                DeviceServiceGet.getInstance().getEmv().init(null, 1);
            } catch (RemoteException e) {
                e.printStackTrace();
            }
        });
        binding.btEmvProcess.setOnClickListener(view -> {
            setResult("start emv process testing");
            testEmvProcess();
        });
        initEmvParams();
    }

    private void initEmvParams() {
        try {
            IEmv emv = DeviceServiceGet.getInstance().getEmv();
            emv.clearAids();
            emv.clearCapks();
//            emv.init(null,0);
            emv.addAids(aids);
            emv.addCapks(capks);
        } catch (RemoteException e) {
            e.printStackTrace();
        }
    }

    private void wirteKey() {
        new Thread() {
            @Override
            public void run() {
                super.run();
                try {
                    boolean ret = DeviceServiceGet.getInstance().getPinpad().loadMainKey(1, 0, StringUtil.hexString2Bytes(Constant.PED_TMK), StringUtil.hexString2Bytes(Constant.PED_TMK_KCV));
                    Log.d(TAG, "load main key->" + ret);
                    setResult("load mainkey " + (ret ? "successful" : "failure"));
                    ret = DeviceServiceGet.getInstance().getPinpad().loadWorkKey(PedConstant.KeyType.PIN_KEY, 1, 2, StringUtil.hexString2Bytes(Constant.PED_TPK), StringUtil.hexString2Bytes(Constant.PED_TPK_KCV));
                    Log.d(TAG, "load pin work key->" + ret);
                    setResult("load pin key " + (ret ? "successful" : "failure"));
                } catch (RemoteException e) {
                    e.printStackTrace();
                    setResult("load pin key ");
                }
            }
        }.start();
    }

    private void searchCard() {
        showDialog("Card Searching");
        try {
            Bundle bundle = new Bundle();
            bundle.putBoolean("supportMagCard", true);
            bundle.putBoolean("supportICCard", true);
            bundle.putBoolean("supportRFCard", true);
            DeviceServiceGet.getInstance().getEmv().waitCard(bundle, 60, readCardListener);
        } catch (RemoteException e) {
            e.printStackTrace();
            dismissDialog();
        }
    }

    private void testEmvProcess() {
        showDialog("ic card searching");
        try {
            IEmv emv = DeviceServiceGet.getInstance().getEmv();
            Bundle bundle = new Bundle();
            bundle.putBoolean("supportICCard", true);
            bundle.putBoolean("supportRFCard", true);
            emv.waitCard(bundle, 60, emvCardListener);
//        String kernelVersion = emv.getKernelVersion();
//        Log.d(TAG,"kernelVersion-->"+kernelVersion);
        } catch (RemoteException e) {
            e.printStackTrace();
            dismissDialog();
        }
    }

    /**
     * @param type 0:contact 1:contactless
     */
    private void initInputParam(int type) throws RemoteException {
        inputBundle = new Bundle();

        final com.sunyard.api.emv.EmvTermConfig emvTermConfig = DeviceServiceGet.getInstance().getEmv().getTermConfig();
        Log.e(TAG, "initInputParam CAP:" + StringUtil.byte2HexStr(emvTermConfig.getTermCap()));
        emvTermConfig.setSupportOnlinePIN(true);
        emvTermConfig.setSupportBypassPIN(true);
//        emvTermConfig.setTermCap(StringUtil.hexString2Bytes("E0F9C8"));
//        emvTermConfig.setTermCountryCode("840".getBytes());
//        emvTermConfig.setTransCurrencyCode("840".getBytes());
        DeviceServiceGet.getInstance().getEmv().setTermConfig(emvTermConfig);


        /*final com.sunyard.api.emv.EmvTermConfig emvTermConfig1 = DeviceServiceGet.getInstance().getEmv().getTermConfig();
        Log.e(TAG, "initInputParam1 CAP:" + StringUtil.byte2HexStr(emvTermConfig1.getTermCap()));*/


        inputBundle.putByteArray(EmvConstant.InputParam.CAP, emvTermConfig.getTermCap());
        //inputBundle.putByteArray(EmvConstant.InputParam.CAP, StringUtil.hexString2Bytes("E0F8E8"));
        inputBundle.putInt(EmvConstant.InputParam.TRANS_TYPE, EmvConstant.TransType.EMV_TRANS_CONSUME);
        inputBundle.putInt(EmvConstant.InputParam.PROC_TYPE, type == 1 ? EmvConstant.EmvTransFlow.EMV_API_PROC_QPBOC : EmvConstant.EmvTransFlow.EMV_API_PROC_PBOC_FULL);
        inputBundle.putInt(EmvConstant.InputParam.SEQ_NO, 1);

        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyyMMddHHmmss");
        Date date = new Date(System.currentTimeMillis());
        String time = dateFormat.format(date);
        Log.d(TAG, "time=" + time);
        inputBundle.putString(EmvConstant.InputParam.TRANS_DATE, time.substring(2, 8));
        inputBundle.putString(EmvConstant.InputParam.TRANS_TIME, time.substring(8, 14));
        inputBundle.putBoolean(EmvConstant.InputParam.IS_PBOC_FORCEONLINE, true);
        inputBundle.putBoolean(EmvConstant.InputParam.IS_QPBOC_FORCEONLINE, true);

        inputBundle.putString(EmvConstant.InputParam.TRANS_CURRCODE, "156");
        inputBundle.putInt(EmvConstant.InputParam.TRANS_AMOUNT, 100000);
        inputBundle.putString(EmvConstant.InputParam.TERM_COUNTRY_CODE, "840");
        inputBundle.putString(EmvConstant.InputParam.TAG_9C, "00");
        inputBundle.putByteArray(EmvConstant.InputParam.CAP, emvTermConfig.getTermCap());
        //inputBundle.putByteArray(EmvConstant.InputParam.CAP, StringUtil.hexString2Bytes("60F8E8"));
//        boolean mIsContactlessSupportSelectApp = bundle.getBoolean(EmvConstant.InputParam.IS_SUPPORT_PICC_APP_SELECT,false);
//        param.mIsContactlessSupportSelectApp = mIsContactlessSupportSelectApp;
        inputBundle.putBoolean(EmvConstant.InputParam.IS_SUPPORT_PICC_APP_SELECT,true);
    }

    private static class ReadCardListener extends OnWaitCardListener.Stub {

        private final WeakReference<CardActivity> activityRef;

        public ReadCardListener(CardActivity activity) {
            activityRef=new WeakReference<>(activity);
        }

        @Override
        public void onCardSwiped(Bundle bundle) throws RemoteException {
            CardActivity cardActivity=activityRef.get();
            if (cardActivity!=null){
                cardActivity.setResult("check mag card successful.\nresult:" + StringUtil.showBundleData(bundle));
                cardActivity.dismissDialog();
            }
        }

        @Override
        public void onCardPowerUp() throws RemoteException {
            CardActivity cardActivity=activityRef.get();
            if (cardActivity!=null){
                cardActivity.setResult("check icc card successful.");
                cardActivity.dismissDialog();
            }
        }

        @Override
        public void onCardActivate() throws RemoteException {
            CardActivity cardActivity=activityRef.get();
            if (cardActivity!=null){
                cardActivity.setResult("check picc card successful.");
                cardActivity.dismissDialog();
            }
        }

        @Override
        public void onTimeout() throws RemoteException {
            CardActivity cardActivity=activityRef.get();
            if (cardActivity!=null){
                cardActivity.setResult("check card timeout.");
                cardActivity.dismissDialog();
            }
        }

        @Override
        public void onError(int errCode, String msg) throws RemoteException {
            CardActivity cardActivity=activityRef.get();
            Log.d(cardActivity.TAG, "check card error,errCode:" + errCode + ",msg:" + msg);
            if (cardActivity!=null){
                cardActivity.setResult("check card error,errCode:" + errCode + ",msg:" + msg);
                cardActivity.dismissDialog();
            }
        }
    }

    private static class EmvCardListener extends OnWaitCardListener.Stub {

        private final WeakReference<CardActivity> activityRef;

        public EmvCardListener(CardActivity activity) {
            activityRef=new WeakReference<>(activity);
        }
        @Override
        public void onCardSwiped(Bundle bundle) throws RemoteException {
            CardActivity cardActivity=activityRef.get();
            if (cardActivity!=null) {
                cardActivity.setResult("check mag card successful.");
                cardActivity.dismissDialog();
            }
        }

        @Override
        public void onCardPowerUp() throws RemoteException {
            CardActivity cardActivity=activityRef.get();
            if (cardActivity!=null) {
                cardActivity.setResult("check icc card successful.");
                try {
                    cardActivity.initInputParam(0);
                    cardActivity.inputBundle.putInt(EmvConstant.InputParam.CARD_TYPE, EmvConstant.EmvTransFlow.EMV_API_CHANNEL_FROM_ICC);
                    cardActivity.dismissDialog();
                    cardActivity.showDialog("emv processing");
                    cardActivity.cardNo="";
                    DeviceServiceGet.getInstance().getEmv().startEMV(0, cardActivity.inputBundle, cardActivity.onEMVHandler);
                } catch (Exception e) {
                    e.printStackTrace();
                    cardActivity.dismissDialog();
                }
            }
        }

        @Override
        public void onCardActivate() throws RemoteException {
            CardActivity cardActivity=activityRef.get();
            if (cardActivity!=null) {
                cardActivity.setResult("check picc card successful.");
                try {
                    cardActivity.initInputParam(1);
                    cardActivity.inputBundle.putInt(EmvConstant.InputParam.CARD_TYPE, EmvConstant.EmvTransFlow.EMV_API_CHANNEL_FORM_PICC);
                    cardActivity.dismissDialog();
                    cardActivity.showDialog("emv processing");
                    cardActivity.cardNo="";
                    DeviceServiceGet.getInstance().getEmv().startEMV(1, cardActivity.inputBundle, cardActivity.onEMVHandler);
                } catch (Exception e) {
                    e.printStackTrace();
                    cardActivity.dismissDialog();
                }
            }
        }

        @Override
        public void onTimeout() throws RemoteException {
            CardActivity cardActivity=activityRef.get();
            if (cardActivity!=null) {
                cardActivity.dismissDialog();
                cardActivity.setResult("check card timeout.");
            }
        }

        @Override
        public void onError(int errCode, String msg) throws RemoteException {
            CardActivity cardActivity=activityRef.get();
            Log.d(cardActivity.TAG,"check card error,errCode:" + errCode + ",msg:" + msg);
            if (cardActivity!=null) {
                cardActivity.dismissDialog();
                cardActivity.setResult("check card error,errCode:" + errCode + ",msg:" + msg);
            }
        }
    }

    private static class MyOnInputPinListener extends OnInputPinListener.Stub {
        private final WeakReference<CardActivity> activityRef;

        public MyOnInputPinListener(CardActivity activity) {
            activityRef=new WeakReference<>(activity);
        }

        @Override
        public void onCancel() throws RemoteException {
            CardActivity cardActivity=activityRef.get();
            if (cardActivity!=null) {
                Log.d(cardActivity.TAG, "onCancel-->");
                //DeviceServiceGet.getInstance().getEmv().abortEMV();
                DeviceServiceGet.getInstance().getEmv().onSetPinResult(0, null);
            }
        }

        @Override
        public void onConfirm(byte[] pinResult, boolean b) throws RemoteException {
            CardActivity cardActivity=activityRef.get();
            if (cardActivity!=null) {
                Log.d(cardActivity.TAG, "onConfirm-->" + b);
                if (pinResult == null && b) {
                    Log.d(cardActivity.TAG, "bypass is null");
                    DeviceServiceGet.getInstance().getEmv().onSetPinResult(1, null);
                } else {
                    Log.d(cardActivity.TAG, "pinResult is not null," + StringUtil.byte2HexStr(pinResult));
                    DeviceServiceGet.getInstance().getEmv().onSetPinResult(1, pinResult);
                }
            }
        }

        @Override
        public void onError(int i) throws RemoteException {
            //error same as cancel
            CardActivity cardActivity=activityRef.get();
            Log.d(cardActivity.TAG, "OnInputPinListener onError-->" + i);
            DeviceServiceGet.getInstance().getEmv().onSetPinResult(0, null);
        }

        @Override
        public void onInput(int i, int i1) throws RemoteException {

        }
    }

    private static class MyOnEMVHandler extends OnEMVHandler.Stub{

        private final WeakReference<CardActivity> activityRef;

        public MyOnEMVHandler(CardActivity activity) {
            activityRef=new WeakReference<>(activity);
        }
        @Override
        public void onRequestAmount() throws RemoteException {
            Log.d(TAG, "onRequestAmount");
        }

        @Override
        public void onSelectApplication(List<String> list) throws RemoteException {
            CardActivity cardActivity=activityRef.get();
            Log.d("TAG", "onSelectApplist===: "+list.size());
            if (cardActivity!=null) {
                Log.d(cardActivity.TAG, "onSelectApplication-->");
                DeviceServiceGet.getInstance().getEmv().onSetAppSelectResult(2);
            }
        }

        @Override
        public void onSelectAccountType() throws RemoteException {
            Log.d(TAG, "onSelectAccountType");
        }

        @Override
        public void onConfirmCardInfo(Bundle bundle) throws RemoteException {
            CardActivity cardActivity=activityRef.get();
            if (cardActivity!=null) {
                Log.d(cardActivity.TAG, "onConfirmCardInfo-->");
                cardActivity.cardNo = "";
                cardActivity.cardNo = bundle.getString("PAN");
                cardActivity.CARD_SN = bundle.getString("CARD_SN");
                cardActivity.CARD_HOLDER_NAME = bundle.getString("CARD_HOLDER_NAME");
                Log.d(cardActivity.TAG, "cardNo1-->" + cardActivity.cardNo);
                Log.d(cardActivity.TAG, "CARD_SN-->" + cardActivity.CARD_SN);
                Log.d(cardActivity.TAG, "CARD_HOLDER_NAME-->" + cardActivity.CARD_HOLDER_NAME);
                if (!TextUtils.isEmpty(cardActivity.cardNo)) {
                    if (cardActivity.cardNo.contains("F")) {
                        cardActivity.cardNo = cardActivity.cardNo.split("F")[0];
                        Log.d(cardActivity.TAG, "cardNo2-->" + cardActivity.cardNo);
                    }
                }
                DeviceServiceGet.getInstance().getEmv().onSetCardConfirmResult(true);
            }
        }

        @Override
        public void onRequestInputPIN(boolean inOnline, int retryTime) throws RemoteException {
            CardActivity cardActivity=activityRef.get();
            if (cardActivity!=null) {
                Log.d(cardActivity.TAG, "onRequestInputPIN-->" + inOnline);
                Bundle pinBundle = new Bundle();
                pinBundle.putBoolean("isOnline", inOnline);
                //byte[] pan = Convert.strToBcdBytes(cardNo, true);
                pinBundle.putByteArray("panBlock", cardActivity.cardNo.getBytes());
                pinBundle.putByteArray("pinLimit", new byte[]{0x00, 0x04, 0x06, 0x0C});
                pinBundle.putInt("timeout", 60);
                pinBundle.putInt("mode", 1);
                pinBundle.putBoolean("isKeyRandom", false);
                pinBundle.putString("text", "please input pin");
                DeviceServiceGet.getInstance().getPinpad().startPinInput(2, pinBundle, cardActivity.pinListener);
                //DeviceServiceGet.getInstance().getEmv().onSetPinResult(1, null);
            }
        }

        @Override
        public void onConfirmCertInfo(String s, String s1) throws RemoteException {
            CardActivity cardActivity=activityRef.get();
            if (cardActivity!=null) {
                Log.d(cardActivity.TAG, "onConfirmCertInfo-->");
                DeviceServiceGet.getInstance().getEmv().onSetCertConfirmResult(1);
            }
        }

        @Override
        public void onTermRiskManage(byte[] bytes, int i) throws RemoteException {
        }

        @Override
        public void onRequestOnlineProcess(int result) throws RemoteException {
            CardActivity cardActivity=activityRef.get();
            if (cardActivity!=null) {
                Log.d(cardActivity.TAG, "onRequestOnlineProcess-->" + result);
                if (result == 1 || result == 3) {
                    // go online
                    byte[] tag = StringUtil.hexStr2Bytes("5A8284959A9C5F245F2A5F349F029F039F089F109F1A9F1E9F269F279F339F349F359F369F379F5B9F669F6E9F7C00");
                    //byte[] tag = StringUtil.hexStr2Bytes("579F269F279F109F379F36959A9F219C9F025F2A829F1A9F039F339F349F359F1E9F06849F099F419F535F345A5F249F079B9F119F125F20995F255F30509F4000");
                    String tlvData = DeviceServiceGet.getInstance().getEmv().getAppTLVList(tag);
                    Log.d(cardActivity.TAG, "tlvdata->" + tlvData);
                    byte[] tag9F41 = DeviceServiceGet.getInstance().getEmv().getCardData("9F41");
                    Log.d(cardActivity.TAG, "9F41->" + StringUtil.byte2HexStr(tag9F41));
                    byte[] tag5F2A = DeviceServiceGet.getInstance().getEmv().getCardData("5F2A");
                    Log.d(cardActivity.TAG, "5F2A->" + StringUtil.byte2HexStr(tag5F2A));
                    byte[] tag5F28 = DeviceServiceGet.getInstance().getEmv().getCardData("5F28");
                    Log.d(cardActivity.TAG, "5F28->" + StringUtil.byte2HexStr(tag5F28));
                    if (tlvData != null) {
                        Map<String, String> map = TlvUtil.tlvToMap(tlvData);
                        StringBuilder sb = new StringBuilder();
                        for (Map.Entry<String, String> entry : map.entrySet()) {
                            sb.append(entry.getKey()).append(" : ").append(entry.getValue()).append("\n");
                        }
                        cardActivity.updateResult("[getTLVData]\n" + sb.toString());
                        Log.d("WY", "[getTLVData]");
                    } else {
                        cardActivity.updateResult("[getTLVData]fail");
                    }
                    doOnlieResult();
                } else {
                    //error
                }
                //set the online result which return by the bank platform
                cardActivity.dismissDialog();
            }
        }

        @Override
        public void onTransactionResult(int i, Bundle bundle) throws RemoteException {
            CardActivity cardActivity=activityRef.get();
            if (cardActivity!=null) {
                Log.e(cardActivity.TAG, "onTransactionResult-->" + i);
            }
        }
    }

    private static void doOnlieResult() throws RemoteException {
        Bundle onlineBun = new Bundle();
        onlineBun.putString("filed55", "");//the filed 55,like Tag 91 71 ect.
        onlineBun.putString("respCode", "");// response code
        DeviceServiceGet.getInstance().getEmv().onSetOnlineResult(onlineBun, new OnOnlineResultHandler.Stub() {
            @Override
            public void onFinalResult(int ret) throws RemoteException {
                //ret == 0 successful.
            }
        });
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
                dialog = new ProgressDialog(CardActivity.this);
                dialog.setMessage(message);
                dialog.setIndeterminate(true);
                dialog.setCancelable(false);
                dialog.show();
            }
        });
    }

    private void dismissDialog() {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (dialog != null && dialog.isShowing()) {
                    dialog.dismiss();
                }
            }
        });
    }

    private void updateResult(final String result) {
        setResult(result);
    }

    private void appendResult(final String result) {
        setResult(result);
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

    public static final String[] aids = {
            "9f0608a000000790010502df0101009f08020200df1105fc6024a800df1205fc60acf800df130500100000009f1b0400000000df150400000000df160199df170199df14039f3704df1801019f7b06000000100000df1906000000200000df2006000000200000df21060000001000005f2a0201569f1a0203569f090202009f3303e0d9c8",
            "9f0608a000000025010502df010100df1105dc50fc9800df1205de00fc9800df130500100000009f1b0400000000df150400000000df160199df170199df14039f3704df1801019f7b06000001000000df1906000000200000df2006000000200000df21060000000010005f2a0201569f1a0208409f090200019f3303e0d9c89F6604340040009F3501229F6E0418000003",
            "9f0607a0000000651010df010100df1105fc6024a800df1205fc60acf800df130500100000009f1b0400000000df150400000000df160100df170100df14039f3704df1801019f7b06000000100000df1906000000200000df2006000000200000df21060000001000005f2a0203569f1a0203569f090202009f3303e0d9c8",
            "9f0607a0000000650200df0101009f08020200df1105fc6024a800df1205fc60acf800df130500100000009f1b0400000000df150400000000df160100df170100df14039f3704df1801019f7b06000000100000df1906000000200000df2006000000200000df21060000001000005f2a0203569f1a0203569f090202009f3303e0d9c8",
            "9f0607a0000001523010df0101009f08020200df1105fc6024a800df1205fc60acf800df130500100000009f1b0400000000df150400000000df160100df170100df14039f3704df1801019f7b06000000100000df1906000000200000df2006000000200000df21060000001000005f2a0203569f1a0203569f090202009f3303e0d9c8",
            "9f0607a0000001520001df0101009f08020200df1105fc6024a800df1205fc60acf800df130500100000009f1b0400000000df150400000000df160100df170100df14039f3704df1801019f7b06000000100000df1906000000200000df2006000000200000df21060000001000005f2a0203569f1a0203569f090202009f3303e0d9c8",
            "9f0607a0000005241010df0101009f08020200df1105fc6024a800df1205fc60acf800df130500100000009f1b0400000000df150400000000df160100df170100df14039f3704df1801019f7b06000000100000df1906000000200000df2006000000200000df21060000001000005f2a0203569f1a0203569f090202009f3303e0d9c8",
            "9f0607a0000005240064df0101009f08020200df1105fc6024a800df1205fc60acf800df130500100000009f1b0400000000df150400000000df160100df170100df14039f3704df1801019f7b06000000100000df1906000000200000df2006000000200000df21060000001000005f2a0203569f1a0203569f090202009f3303e0d9c8",
            // UnionPay
            "9f0608a000000333010101df0101009f08020200df1105fc6024a800df1205fc60acf800df130500100000009f1b0400000000df150400000000df160199df170199df14039f3704df1801019f7b06000000100000df1906000000200000df2006000000200000df21060000001000005f2a0201569f1a0203569f090202009f3303e0d9c8",
            "9f0608a000000333010102df0101009f08020200df1105fc6024a800df1205fc60acf800df130500100000009f1b0400000000df150400000000df160199df170199df14039f3704df1801019f7b06000000100000df1906000000200000df2006000000200000df21060000001000005f2a0201569f1a0203569f090202009f3303e0d9c8",
            "9f0608a000000333010103df0101009f08020200df1105fc6024a800df1205fc60acf800df130500100000009f1b0400000000df150400000000df160199df170199df14039f3704df1801019f7b06000000100000df1906000000200000df2006000000200000df21060000001000005f2a0201569f1a0203569f090202009f3303e0d9c8",
            // Visa
            "9f0607a0000000032010df0101009f08020140df1105d84000a800df1205d84004f800df130500100000009f1b0400000000df150400000000df160199df170199df14039f3704df1801019f7b06000000100000df1906000000200000df2006000000200000df21060000001000005f2a0203569f1a0203569f090200029f3303e0d9c8",
            "9f0607a0000000031010df0101009f08020140df1105584000A800df1205584004F800df130500100000009f1b0400010000df150400000000df160199df170199df14039f3704df1801019f7b06000000100000df1906000000050000df2006000000200000df21060000001000005f2a0209369f1a0208409f090200029f3303e0d9c89f660436e04000", // Visa卡9f660436e04000
            "9f0608a000000003101001df0101009f08020140df1105584000A800df1205584004F800df130500100000009f1b0400010000df150400000000df160199df170199df14039f3704df1801019f7b06000000100000df1906000000050000df2006000000500000df21060000000100005f2a0209369f1a0208409f090200029f3303e0d9c89f660436e04000", //
            "9f0607a0000000033010df0101009f08020140df1105d84000a800df1205d84004f800df130500100000009f1b0400000000df150400000000df160199df170199df14039f3704df1801019f7b06000000100000df1906000000200000df2006000000200000df21060000001000005f2a0203569f1a0203569f090200029f3303e0d9c8",
            // MasterCard
            "9f0607a0000000043060df0101009f08020002df1105fc5058a000df1205f85058f800df130504000000009f1b0400000000df150400000000df160199df170199df14039f3704df1801019f7b06000000100000df1906000000200000df2006000000200000df21060000001000005f2a0203569f1a0203569f090200029f3303e0d9c8df811b01A0",
            "9f0607a0000000041010df0101009f08020002df1105fc5080a000df1205f85080f800df130504000000009f1b0400000000df150400000000df160199df170199df14039f3704df1801019f7b06000000010000df1906000000200000df2006000000200000df21060000000100005f2a0203569f1a0203569f09020002df81170100df81180160df81190108",
            "9f0607a0000000049999df0101009f08020140df1105d84000a800df1205d84004f800df130500100000009f1b0400000000df150400000000df160199df170199df14039f3704df1801019f7b06000000100000df1906000000200000df2006000000200000df21060000001000005f2a0203569f1a0203569f090200029f3303e0d9c8",
            "9f0607a0000000046000df0101009f08020140df1105d84000a800df1205d84004f800df130500100000009f1b0400000000df150400000000df160199df170199df14039f3704df1801019f7b06000000100000df1906000000200000df2006000000200000df21060000001000005f2a0203569f1a0203569f090200029f3303e0d9c8",

            "9f0607A0000007341010df0101009f08020200df1105fc6024a800df1205fc60acf800df130500100000009f1b0400000000df150400000000df160199df170199df14039f3704df1801019f7b06000000100000df1906000000200000df2006000000200000df21060000001000005f2a0209369f1a0202889f090202009f3303e0d9c8",
            "9f0607A0000006581010df0101009f08020200df1105fc6024a800df1205fc60acf800df130500100000009f1b0400000000df150400000000df160199df170199df14039f3704df1801019f7b06000000100000df1906000000200000df2006000000200000df21060000001000005f2a0209369f1a0202889f090202009f3303e0d9c8",
            "9f0607A0000000011111df0101009f08020200df1105fc6024a800df1205fc60acf800df130500100000009f1b0400000000df150400000000df160199df170199df14039f3704df1801019f7b06000000100000df1906000000200000df2006000000200000df21060000001000005f2a0209369f1a0202889f090202009f3303e0d9c8",
            "9f0606a00000002501df010100df1105dc50fc9800df1205de00fc9800df130500100000009f1b0400000000df150400000000df160199df170199df14039f3704df1801019f7b06000001000000df1906000000200000df2006000000200000df21060000000000015f2a0203569f1a0203569f090200019f3303e0d9c89F660434004000"
            //df20非接交易的最大限额，df21超过这个限额需要输密，一般情况下df20比df21大
    };
    public static final String[] capks = {
            "9f0605a0000000039f220101df05083230313231323331df060101df070101df028180c696034213d7d8546984579d1d0f0ea519cff8deffc429354cf3a871a6f7183f1228da5c7470c055387100cb935a712c4e2864df5d64ba93fe7e63e71f25b1e5f5298575ebe1c63aa617706917911dc2a75ac28b251c7ef40f2365912490b939bca2124a30a28f54402c34aeca331ab67e1e79b285dd5771b5d9ff79ea630b75df040103df0314d34a6a776011c7e7ce3aec5f03ad2f8cfc5503cc",

            "9f0605a0000000049f220103df05083230313231323331df060101df070101df028180c2490747fe17eb0584c88d47b1602704150adc88c5b998bd59ce043edebf0ffee3093ac7956ad3b6ad4554c6de19a178d6da295be15d5220645e3c8131666fa4be5b84fe131ea44b039307638b9e74a8c42564f892a64df1cb15712b736e3374f1bbb6819371602d8970e97b900793c7c2a89a4a1649a59be680574dd0b60145df040103df03145addf21d09278661141179cbeff272ea384b13bb",
            "9f0605a0000003339f220109df05083230313231323331df060101df070101df0281b0eb374dfc5a96b71d2863875eda2eafb96b1b439d3ece0b1826a2672eeefa7990286776f8bd989a15141a75c384dfc14fef9243aab32707659be9e4797a247c2f0b6d99372f384af62fe23bc54bcdc57a9acd1d5585c303f201ef4e8b806afb809db1a3db1cd112ac884f164a67b99c7d6e5a8a6df1d3cae6d7ed3d5be725b2de4ade23fa679bf4eb15a93d8a6e29c7ffa1a70de2e54f593d908a3bf9ebbd760bbfdc8db8b54497e6c5be0e4a4dac29e5df040103df0314a075306eab0045baf72cdd33b3b678779de1f527",
            "9f0605a0000003339f220104df05083230313431323331df060101df070101df0281f8bc853e6b5365e89e7ee9317c94b02d0abb0dbd91c05a224a2554aa29ed9fcb9d86eb9ccbb322a57811f86188aac7351c72bd9ef196c5a01acef7a4eb0d2ad63d9e6ac2e7836547cb1595c68bcbafd0f6728760f3a7ca7b97301b7e0220184efc4f653008d93ce098c0d93b45201096d1adff4cf1f9fc02af759da27cd6dfd6d789b099f16f378b6100334e63f3d35f3251a5ec78693731f5233519cdb380f5ab8c0f02728e91d469abd0eae0d93b1cc66ce127b29c7d77441a49d09fca5d6d9762fc74c31bb506c8bae3c79ad6c2578775b95956b5370d1d0519e37906b384736233251e8f09ad79dfbe2c6abfadac8e4d8624318c27daf1df040103df0314f527081cf371dd7e1fd4fa414a665036e0f5e6e5",
            "9F0605A0000000659F220109DF05083230303931323331DF060101DF070101DF028180B72A8FEF5B27F2B550398FDCC256F714BAD497FF56094B7408328CB626AA6F0E6A9DF8388EB9887BC930170BCC1213E90FC070D52C8DCD0FF9E10FAD36801FE93FC998A721705091F18BC7C98241CADC15A2B9DA7FB963142C0AB640D5D0135E77EBAE95AF1B4FEFADCF9C012366BDDA0455C1564A68810D7127676D493890BDDF040103DF03144410C6D51C2F83ADFD92528FA6E38A32DF048D0A",
            "9F0605A0000000659F220110DF05083230313231323331DF060101DF070101DF02819099B63464EE0B4957E4FD23BF923D12B61469B8FFF8814346B2ED6A780F8988EA9CF0433BC1E655F05EFA66D0C98098F25B659D7A25B8478A36E489760D071F54CDF7416948ED733D816349DA2AADDA227EE45936203CBF628CD033AABA5E5A6E4AE37FBACB4611B4113ED427529C636F6C3304F8ABDD6D9AD660516AE87F7F2DDF1D2FA44C164727E56BBC9BA23C0285DF040103DF0314C75E5210CBE6E8F0594A0F1911B07418CADB5BAB",
            "9f0605a0000003339f22010adf05083230313431323331df060101df070101df028180b2ab1b6e9ac55a75adfd5bbc34490e53c4c3381f34e60e7fac21cc2b26dd34462b64a6fae2495ed1dd383b8138bea100ff9b7a111817e7b9869a9742b19e5c9dac56f8b8827f11b05a08eccf9e8d5e85b0f7cfa644eff3e9b796688f38e006deb21e101c01028903a06023ac5aab8635f8e307a53ac742bdce6a283f585f48efdf040103df0314c88be6b2417c4f941c9371ea35a377158767e4e3",

            "9f0605a0000000039f220108df05083230313431323331df060101df070101df0281b0d9fd6ed75d51d0e30664bd157023eaa1ffa871e4da65672b863d255e81e137a51de4f72bcc9e44ace12127f87e263d3af9dd9cf35ca4a7b01e907000ba85d24954c2fca3074825ddd4c0c8f186cb020f683e02f2dead3969133f06f7845166aceb57ca0fc2603445469811d293bfefbafab57631b3dd91e796bf850a25012f1ae38f05aa5c4d6d03b1dc2e568612785938bbc9b3cd3a910c1da55a5a9218ace0f7a21287752682f15832a678d6e1ed0bdf040103df031420d213126955de205adc2fd2822bd22de21cf9a8",

            "9f0605a0000003339f220102df05083230313431323331df060101df070101df028190a3767abd1b6aa69d7f3fbf28c092de9ed1e658ba5f0909af7a1ccd907373b7210fdeb16287ba8e78e1529f443976fd27f991ec67d95e5f4e96b127cab2396a94d6e45cda44ca4c4867570d6b07542f8d4bf9ff97975db9891515e66f525d2b3cbeb6d662bfb6c3f338e93b02142bfc44173a3764c56aadd202075b26dc2f9f7d7ae74bd7d00fd05ee430032663d27a57df040103df031403bb335a8549a03b87ab089d006f60852e4b8060",
            "9F0605A0000000659F220112DF05083230313431323331DF060101DF070101DF0281B0ADF05CD4C5B490B087C3467B0F3043750438848461288BFEFD6198DD576DC3AD7A7CFA07DBA128C247A8EAB30DC3A30B02FCD7F1C8167965463626FEFF8AB1AA61A4B9AEF09EE12B009842A1ABA01ADB4A2B170668781EC92B60F605FD12B2B2A6F1FE734BE510F60DC5D189E401451B62B4E06851EC20EBFF4522AACC2E9CDC89BC5D8CDE5D633CFD77220FF6BBD4A9B441473CC3C6FEFC8D13E57C3DE97E1269FA19F655215B23563ED1D1860D8681DF040103DF0314874B379B7F607DC1CAF87A19E400B6A9E25163E8",

            "9f0605a0000000039f220107df05083230313231323331df060101df070101df028190a89f25a56fa6da258c8ca8b40427d927b4a1eb4d7ea326bbb12f97ded70ae5e4480fc9c5e8a972177110a1cc318d06d2f8f5c4844ac5fa79a4dc470bb11ed635699c17081b90f1b984f12e92c1c529276d8af8ec7f28492097d8cd5becea16fe4088f6cfab4a1b42328a1b996f9278b0b7e3311ca5ef856c2f888474b83612a82e4e00d0cd4069a6783140433d50725fdf040103df0314b4bc56cc4e88324932cbc643d6898f6fe593b172",

            "9f0605a0000000049f220163df05083230313231323331df060101df070101df028190cf71f040528c9af2bf4341c639b7f31be1abff269633542cf22c03ab51570402c9cafc14437ae42f4e7cad00c9811b536dff3792facb86a0c7fae5fa50ae6c42546c534ea3a11fbd2267f1cf9ac68874dc221ecb3f6334f9c0bb832c075c2961ca9bbb683bec2477d12344e1b7d6dbe07b286fcf41a0f7f1f6f248a8c86398b7fa1c115111051dd01df3ed08985705fddf040103df03146e5ff80cd0a1cc2e3249b9c198d43427ce874013",
            "9f0605a0000000049f220104df05083230313231323331df060101df070101df028190a6da428387a502d7ddfb7a74d3f412be762627197b25435b7a81716a700157ddd06f7cc99d6ca28c2470527e2c03616b9c59217357c2674f583b3ba5c7dcf2838692d023e3562420b4615c439ca97c44dc9a249cfce7b3bfb22f68228c3af13329aa4a613cf8dd853502373d62e49ab256d2bc17120e54aedced6d96a4287acc5c04677d4a5a320db8bee2f775e5fec5df040103df0314381a035da58b482ee2af75f4c3f2ca469ba4aa6c",

            "9f0605a0000000039f220109df05083230313631323331df060101df070101df0281f89d912248de0a4e39c1a7dde3f6d2588992c1a4095afbd1824d1ba74847f2bc4926d2efd904b4b54954cd189a54c5d1179654f8f9b0d2ab5f0357eb642feda95d3912c6576945fab897e7062caa44a4aa06b8fe6e3dba18af6ae3738e30429ee9be03427c9d64f695fa8cab4bfe376853ea34ad1d76bfcad15908c077ffe6dc5521ecef5d278a96e26f57359ffaeda19434b937f1ad999dc5c41eb11935b44c18100e857f431a4a5a6bb65114f174c2d7b59fdf237d6bb1dd0916e644d709ded56481477c75d95cdd68254615f7740ec07f330ac5d67bcd75bf23d28a140826c026dbde971a37cd3ef9b8df644ac385010501efc6509d7a41df040103df03141ff80a40173f52d7d27e0f26a146a1c8ccb29046",
            "9f0605a0000000039f220163df05083230313231323331df060101df070101df028190cf71f040528c9af2bf4341c639b7f31be1abff269633542cf22c03ab51570402c9cafc14437ae42f4e7cad00c9811b536dff3792facb86a0c7fae5fa50ae6c42546c534ea3a11fbd2267f1cf9ac68874dc221ecb3f6334f9c0bb832c075c2961ca9bbb683bec2477d12344e1b7d6dbe07b286fcf41a0f7f1f6f248a8c86398b7fa1c115111051dd01df3ed08985705fddf040103df0314b2f6af1ddc393be17525d0ea7bf568bed5b71167",

            "9f0605a0000000049f220106df05083230313631323331df060101df070101df0281f8cb26fc830b43785b2bce37c81ed334622f9622f4c89aae641046b2353433883f307fb7c974162da72f7a4ec75d9d657336865b8d3023d3d645667625c9a07a6b7a137cf0c64198ae38fc238006fb2603f41f4f3bb9da1347270f2f5d8c606e420958c5f7d50a71de30142f70de468889b5e3a08695b938a50fc980393a9cbce44ad2d64f630bb33ad3f5f5fd495d31f37818c1d94071342e07f1bec2194f6035ba5ded3936500eb82dfda6e8afb655b1ef3d0d7ebf86b66dd9f29f6b1d324fe8b26ce38ab2013dd13f611e7a594d675c4432350ea244cc34f3873cba06592987a1d7e852adc22ef5a2ee28132031e48f74037e3b34ab747fdf040103df0314f910a1504d5ffb793d94f3b500765e1abcad72d9",
            "9f0605a0000000049f220105df05083230313431323331df060101df070101df0281b0b8048abc30c90d976336543e3fd7091c8fe4800df820ed55e7e94813ed00555b573feca3d84af6131a651d66cff4284fb13b635edd0ee40176d8bf04b7fd1c7bacf9ac7327dfaa8aa72d10db3b8e70b2ddd811cb4196525ea386acc33c0d9d4575916469c4e4f53e8e1c912cc618cb22dde7c3568e90022e6bba770202e4522a2dd623d180e215bd1d1507fe3dc90ca310d27b3efccd8f83de3052cad1e48938c68d095aac91b5f37e28bb49ec7ed597df040103df0314ebfa0d5d06d8ce702da3eae890701d45e274c845",
            "9f0605a0000003339f220101df05083230313431323331df060101df070101df028180bbe9066d2517511d239c7bfa77884144ae20c7372f515147e8ce6537c54c0a6a4d45f8ca4d290870cda59f1344ef71d17d3f35d92f3f06778d0d511ec2a7dc4ffeadf4fb1253ce37a7b2b5a3741227bef72524da7a2b7b1cb426bee27bc513b0cb11ab99bc1bc61df5ac6cc4d831d0848788cd74f6d543ad37c5a2b4c5d5a93bdf040103df0314e881e390675d44c2dd81234dce29c3f5ab2297a0",
            "9f0605a0000003339f220108df05083230323031323331df060101df070101df028190b61645edfd5498fb246444037a0fa18c0f101ebd8efa54573ce6e6a7fbf63ed21d66340852b0211cf5eef6a1cd989f66af21a8eb19dbd8dbc3706d135363a0d683d046304f5a836bc1bc632821afe7a2f75da3c50ac74c545a754562204137169663cfcc0b06e67e2109eba41bc67ff20cc8ac80d7b6ee1a95465b3b2657533ea56d92d539e5064360ea4850fed2d1bfdf040103df0314ee23b616c95c02652ad18860e48787c079e8e85a",
            "9f0605a0000003339f220103df05083230313431323331df060101df070101df0281b0b0627dee87864f9c18c13b9a1f025448bf13c58380c91f4ceba9f9bcb214ff8414e9b59d6aba10f941c7331768f47b2127907d857fa39aaf8ce02045dd01619d689ee731c551159be7eb2d51a372ff56b556e5cb2fde36e23073a44ca215d6c26ca68847b388e39520e0026e62294b557d6470440ca0aefc9438c923aec9b2098d6d3a1af5e8b1de36f4b53040109d89b77cafaf70c26c601abdf59eec0fdc8a99089140cd2e817e335175b03b7aa33ddf040103df031487f0cd7c0e86f38f89a66f8c47071a8b88586f26",
            "9f0605a0000003339f22010bdf05083230313631323331df060101df070101df0281f8cf9fdf46b356378e9af311b0f981b21a1f22f250fb11f55c958709e3c7241918293483289eae688a094c02c344e2999f315a72841f489e24b1ba0056cfab3b479d0e826452375dcdbb67e97ec2aa66f4601d774feaef775accc621bfeb65fb0053fc5f392aa5e1d4c41a4de9ffdfdf1327c4bb874f1f63a599ee3902fe95e729fd78d4234dc7e6cf1ababaa3f6db29b7f05d1d901d2e76a606a8cbffffecbd918fa2d278bdb43b0434f5d45134be1c2781d157d501ff43e5f1c470967cd57ce53b64d82974c8275937c5d8502a1252a8a5d6088a259b694f98648d9af2cb0efd9d943c69f896d49fa39702162acb5af29b90bade005bc157df040103df0314bd331f9996a490b33c13441066a09ad3feb5f66c",
            "9F0605A0000000659F220114DF05083230313631323331DF060101DF070101DF0281F8AEED55B9EE00E1ECEB045F61D2DA9A66AB637B43FB5CDBDB22A2FBB25BE061E937E38244EE5132F530144A3F268907D8FD648863F5A96FED7E42089E93457ADC0E1BC89C58A0DB72675FBC47FEE9FF33C16ADE6D341936B06B6A6F5EF6F66A4EDD981DF75DA8399C3053F430ECA342437C23AF423A211AC9F58EAF09B0F837DE9D86C7109DB1646561AA5AF0289AF5514AC64BC2D9D36A179BB8A7971E2BFA03A9E4B847FD3D63524D43A0E8003547B94A8A75E519DF3177D0A60BC0B4BAB1EA59A2CBB4D2D62354E926E9C7D3BE4181E81BA60F8285A896D17DA8C3242481B6C405769A39D547C74ED9FF95A70A796046B5EFF36682DC29DF040103DF0314C0D15F6CD957E491DB56DCDD1CA87A03EBE06B7B",
            "9F0605a0000000259F22010FDF05083230313831323331DF060101DF070101DF0281B0C8D5AC27A5E1FB89978C7C6479AF993AB3800EB243996FBB2AE26B67B23AC482C4B746005A51AFA7D2D83E894F591A2357B30F85B85627FF15DA12290F70F05766552BA11AD34B7109FA49DE29DCB0109670875A17EA95549E92347B948AA1F045756DE56B707E3863E59A6CBE99C1272EF65FB66CBB4CFF070F36029DD76218B21242645B51CA752AF37E70BE1A84FF31079DC0048E928883EC4FADD497A719385C2BBBEBC5A66AA5E5655D18034EC5DF040103DF0314429C954A3859CEF91295F663C963E582ED6EB253",
            "9F0605a0000000259F2201C9DF05083230323531323331DF060101DF070101DF0281B0B362DB5733C15B8797B8ECEE55CB1A371F760E0BEDD3715BB270424FD4EA26062C38C3F4AAA3732A83D36EA8E9602F6683EECC6BAFF63DD2D49014BDE4D6D603CD744206B05B4BAD0C64C63AB3976B5C8CAAF8539549F5921C0B700D5B0F83C4E7E946068BAAAB5463544DB18C63801118F2182EFCC8A1E85E53C2A7AE839A5C6A3CABE73762B70D170AB64AFC6CA482944902611FB0061E09A67ACB77E493D998A0CCF93D81A4F6C0DC6B7DF22E62DBDF040103DF03148E8DFF443D78CD91DE88821D70C98F0638E51E49",
            "9F0605a0000000259F2201CADF05083230323631323331DF060101DF070101DF0281F8C23ECBD7119F479C2EE546C123A585D697A7D10B55C2D28BEF0D299C01DC65420A03FE5227ECDECB8025FBC86EEBC1935298C1753AB849936749719591758C315FA150400789BB14FADD6EAE2AD617DA38163199D1BAD5D3F8F6A7A20AEF420ADFE2404D30B219359C6A4952565CCCA6F11EC5BE564B49B0EA5BF5B3DC8C5C6401208D0029C3957A8C5922CBDE39D3A564C6DEBB6BD2AEF91FC27BB3D3892BEB9646DCE2E1EF8581EFFA712158AAEC541C0BBB4B3E279D7DA54E45A0ACC3570E712C9F7CDF985CFAFD382AE13A3B214A9E8E1E71AB1EA707895112ABC3A97D0FCB0AE2EE5C85492B6CFD54885CDD6337E895CC70FB3255E3DF040103DF03146BDA32B1AA171444C7E8F88075A74FBFE845765F",
            "9F0605a0000000259F2201C8DF05083230323531323331DF060101DF070101DF028190BF0CFCED708FB6B048E3014336EA24AA007D7967B8AA4E613D26D015C4FE7805D9DB131CED0D2A8ED504C3B5CCD48C33199E5A5BF644DA043B54DBF60276F05B1750FAB39098C7511D04BABC649482DDCF7CC42C8C435BAB8DD0EB1A620C31111D1AAAF9AF6571EEBD4CF5A08496D57E7ABDBB5180E0A42DA869AB95FB620EFF2641C3702AF3BE0B0C138EAEF202E21DDF040103DF031433BD7A059FAB094939B90A8F35845C9DC779BD50",
            "9F0605A0000000039F220192DF05083230313231323331DF060101DF070101DF0281B0996AF56F569187D09293C14810450ED8EE3357397B18A2458EFAA92DA3B6DF6514EC060195318FD43BE9B8F0CC669E3F844057CBDDF8BDA191BB64473BC8DC9A730DB8F6B4EDE3924186FFD9B8C7735789C23A36BA0B8AF65372EB57EA5D89E7D14E9C7B6B557460F10885DA16AC923F15AF3758F0F03EBD3C5C2C949CBA306DB44E6A2C076C5F67E281D7EF56785DC4D75945E491F01918800A9E2DC66F60080566CE0DAF8D17EAD46AD8E30A247C9FDF040103DF0314429C954A3859CEF91295F663C963E582ED6EB253",
            "9F0605a0000000259F220110DF05083230323531323331DF060101DF070101DF0281F8CF98DFEDB3D3727965EE7797723355E0751C81D2D3DF4D18EBAB9FB9D49F38C8C4A826B99DC9DEA3F01043D4BF22AC3550E2962A59639B1332156422F788B9C16D40135EFD1BA94147750575E636B6EBC618734C91C1D1BF3EDC2A46A43901668E0FFC136774080E888044F6A1E65DC9AAA8928DACBEB0DB55EA3514686C6A732CEF55EE27CF877F110652694A0E3484C855D882AE191674E25C296205BBB599455176FDD7BBC549F27BA5FE35336F7E29E68D783973199436633C67EE5A680F05160ED12D1665EC83D1997F10FD05BBDBF9433E8F797AEE3E9F02A34228ACE927ABE62B8B9281AD08D3DF5C7379685045D7BA5FCDE58637DF040103DF0314C729CF2FD262394ABC4CC173506502446AA9B9FD",
            "9F0605A0000000659F220113DF05083230323531323331DF060101DF070101DF0281F8A3270868367E6E29349FC2743EE545AC53BD3029782488997650108524FD051E3B6EACA6A9A6C1441D28889A5F46413C8F62F3645AAEB30A1521EEF41FD4F3445BFA1AB29F9AC1A74D9A16B93293296CB09162B149BAC22F88AD8F322D684D6B49A12413FC1B6AC70EDEDB18EC1585519A89B50B3D03E14063C2CA58B7C2BA7FB22799A33BCDE6AFCBEB4A7D64911D08D18C47F9BD14A9FAD8805A15DE5A38945A97919B7AB88EFA11A88C0CD92C6EE7DC352AB0746ABF13585913C8A4E04464B77909C6BD94341A8976C4769EA6C0D30A60F4EE8FA19E767B170DF4FA80312DBA61DB645D5D1560873E2674E1F620083F30180BD96CA589DF040103DF031454CFAE617150DFA09D3F901C9123524523EBEDF3",
            "9F0605A0000000659F220111DF05083230323531323331DF060101DF070101DF0281B0A2583AA40746E3A63C22478F576D1EFC5FB046135A6FC739E82B55035F71B09BEB566EDB9968DD649B94B6DEDC033899884E908C27BE1CD291E5436F762553297763DAA3B890D778C0F01E3344CECDFB3BA70D7E055B8C760D0179A403D6B55F2B3B083912B183ADB7927441BED3395A199EEFE0DEBD1F5FC3264033DA856F4A8B93916885BD42F9C1F456AAB8CFA83AC574833EB5E87BB9D4C006A4B5346BD9E17E139AB6552D9C58BC041195336485DF040103DF0314D9FD62C9DD4E6DE7741E9A17FB1FF2C5DB948BCB",
            "9f0605a0000000049f2201F1df05083230323431323331df060101df070101df0281b0A0DCF4BDE19C3546B4B6F0414D174DDE294AABBB828C5A834D73AAE27C99B0B053A90278007239B6459FF0BBCD7B4B9C6C50AC02CE91368DA1BD21AAEADBC65347337D89B68F5C99A09D05BE02DD1F8C5BA20E2F13FB2A27C41D3F85CAD5CF6668E75851EC66EDBF98851FD4E42C44C1D59F5984703B27D5B9F21B8FA0D93279FBBF69E090642909C9EA27F898959541AA6757F5F624104F6E1D3A9532F2A6E51515AEAD1B43B3D7835088A2FAFA7BE7df040103df0314D8E68DA167AB5A85D8C3D55ECB9B0517A1A5B4BB"
    };
}