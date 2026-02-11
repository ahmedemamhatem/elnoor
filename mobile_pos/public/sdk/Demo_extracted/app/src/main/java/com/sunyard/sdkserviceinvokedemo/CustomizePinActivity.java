package com.sunyard.sdkserviceinvokedemo;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Message;
import android.os.RemoteException;
import android.util.Log;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

import com.sunyard.api.dukpt.OnDukptCustomInputPinListener;
import com.sunyard.api.dukpt.PinDukptOutput;
import com.sunyard.api.pinpad.CustomPinBtnLoc;
import com.sunyard.api.pinpad.OnCustomInputPinListener;
import com.sunyard.api.pinpad.PedConstant;
import com.sunyard.sdkserviceinvokedemo.service.DeviceServiceGet;
import com.sunyard.sdkserviceinvokedemo.util.StringUtil;
import com.sunyard.sdkserviceinvokedemo.util.ToneUtil;

import java.util.ArrayList;
import java.util.List;

public class CustomizePinActivity extends AppCompatActivity {
    //private ActivityCustomizePinpadBinding binding;
    private Button[] numButtons = new Button[10];
    private Button delBtn, cancelBtn, okBtn;
    private LinearLayout ll_pinpad;
    private TextView pinpad_result, pinTip;
    private final String TAG = "CustomizePinActivity_SYD";
    private boolean isStartingPin = false;
    private static final int CHECK_PINPAD_START = 1;
    private static final int ON_KEY_EVENT = 2;
    private static final int ON_PIN_NUM_ORDER = 3;


    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_customize_pinpad);
        initView();
    }

    @Override
    protected void onResume() {
        super.onResume();
        mInHandler.sendEmptyMessageDelayed(CHECK_PINPAD_START, 1000);
    }

    @SuppressLint("HandlerLeak")
    private final Handler mInHandler = new Handler() {
        @Override
        public void handleMessage(Message msg) {
            Log.e(TAG, "handleMessage " + msg.what);
            switch (msg.what) {
                case CHECK_PINPAD_START:
                    if (!isStartingPin) {
                        isStartingPin = true;
                        startCustomizePin();
                    }
                    break;
                case ON_KEY_EVENT:
                    int len = msg.arg1;
                    int event = msg.arg2;
                    char[] chars = new char[len];
                    for (int i = 0; i < msg.arg1; i++) {
                        chars[i] = '*';
                    }
                    pinpad_result.setText(String.valueOf(chars));
                    beep();
                    break;
                case ON_PIN_NUM_ORDER:
                    Bundle bd = msg.getData();
                    String data = bd.getString("data");
                    numButtons[1].setText(data.substring(0, 1));
                    numButtons[2].setText(data.substring(1, 2));
                    numButtons[3].setText(data.substring(2, 3));
                    numButtons[4].setText(data.substring(3, 4));
                    numButtons[5].setText(data.substring(4, 5));
                    numButtons[6].setText(data.substring(5, 6));
                    numButtons[7].setText(data.substring(6, 7));
                    numButtons[8].setText(data.substring(7, 8));
                    numButtons[9].setText(data.substring(8, 9));
                    numButtons[0].setText(data.substring(9, 10));
                    ll_pinpad.setVisibility(View.VISIBLE);
                    break;
                default:
                    break;
            }
        }
    };

    private void initView() {
        ToneUtil.getInstance().setCtx(CustomizePinActivity.this);
        numButtons[0] = findViewById(R.id.button0);
        numButtons[1] = findViewById(R.id.button1);
        numButtons[2] = findViewById(R.id.button2);
        numButtons[3] = findViewById(R.id.button3);
        numButtons[4] = findViewById(R.id.button4);
        numButtons[5] = findViewById(R.id.button5);
        numButtons[6] = findViewById(R.id.button6);
        numButtons[7] = findViewById(R.id.button7);
        numButtons[8] = findViewById(R.id.button8);
        numButtons[9] = findViewById(R.id.button9);

        cancelBtn = findViewById(R.id.buttoncancel);
        okBtn = findViewById(R.id.buttonconfirm);
        delBtn = findViewById(R.id.buttondelete);
        ll_pinpad = findViewById(R.id.ll_pinpad);
        pinpad_result = findViewById(R.id.tv_pin);
        pinTip = findViewById(R.id.tv_pls_enter_pin);
        ll_pinpad.setVisibility(View.INVISIBLE);
    }

    private void startCustomizePin() {
        Intent intent = getIntent();
        int pinIndex = intent.getIntExtra("keyIndex", 1);
        boolean isDukpt = intent.getBooleanExtra("isDukpt", false);
        boolean isAes = intent.getBooleanExtra("isDukptAes", false);
        boolean isOnline = intent.getBooleanExtra("isOnline", true);
        boolean isKeyRandom = intent.getBooleanExtra("isKeyRandom", true);
        String cardNo = intent.getStringExtra("cardNo");
        int mode = intent.getIntExtra("mode", 0);
        if (!isOnline)
            pinTip.setText("Please Enter Offline Pin");

        Bundle pinBundle = new Bundle();
        pinBundle.putBoolean("isOnline", isOnline);
        pinBundle.putByteArray("panBlock", cardNo.getBytes());
        pinBundle.putByteArray("pinLimit", new byte[]{0x00, 0x04, 0x06});
        pinBundle.putInt("timeout", 30);
        pinBundle.putBoolean("isKeyRandom", isKeyRandom);//false:num keys random arrangement
        pinBundle.putInt("mode", mode);
        List<CustomPinBtnLoc> pinBtnLocs = getPinBtnLoc(numButtons, okBtn, delBtn, cancelBtn);
        if (!isDukpt) {
            try {
                DeviceServiceGet.getInstance().getPinpad().startCustomPinInput(pinIndex, pinBtnLocs, pinBundle, new OnCustomInputPinListener.Stub() {
                    @Override
                    public void onKeyRanOrder(byte[] bytes) throws RemoteException {
                        Log.e(TAG, "onKeyRanOrder," + StringUtil.byte2HexStr(bytes));
                        Message msg = Message.obtain();
                        Bundle bd = new Bundle();
                        bd.putString("data", new String(bytes));
                        msg.setData(bd);
                        msg.what = ON_PIN_NUM_ORDER;
                        mInHandler.sendMessage(msg);
                    }

                    @Override
                    public void onCancel() throws RemoteException {
                        Log.e(TAG, "onCancel");
                        finish();
                    }

                    @Override
                    public void onConfirm(byte[] block, boolean isNonePin) throws RemoteException {
                        Log.e(TAG, "onConfirm, isNonePin->" + isNonePin);
                        Log.e(TAG, "onConfirm, block->" + StringUtil.byte2HexStr(block));
                        finish();
                    }

                    @Override
                    public void onError(int ret) throws RemoteException {
                        Log.e(TAG, "onError, ret->" + ret);
                        finish();
                    }

                    @Override
                    public void onInput(int len, int event) throws RemoteException {
                        Log.e(TAG, "onInput, ret->" + len + ",event->" + event);
                        Message msg = Message.obtain();
                        msg.what = ON_KEY_EVENT;
                        msg.arg1 = len;
                        msg.arg2 = event;
                        mInHandler.sendMessage(msg);
                    }
                });
            } catch (RemoteException e) {
                e.printStackTrace();
            }
        } else {
            try {
                DeviceServiceGet.getInstance().getDukpt().pedDukptCustomPinInput(isAes ? 1 : 0, pinIndex, pinBtnLocs, pinBundle,
                        new OnDukptCustomInputPinListener.Stub() {
                            @Override
                            public void onKeyRanOrder(byte[] bytes) throws RemoteException {
                                Log.e(TAG, "onKeyRanOrder," + StringUtil.byte2HexStr(bytes));
                                Message msg = Message.obtain();
                                Bundle bd = new Bundle();
                                bd.putString("data", new String(bytes));
                                msg.setData(bd);
                                msg.what = ON_PIN_NUM_ORDER;
                                mInHandler.sendMessage(msg);
                            }

                            @Override
                            public void onCancel() throws RemoteException {
                                Log.e(TAG, "onCancel");
                                finish();
                            }

                            @Override
                            public void onConfirm(PinDukptOutput pinDukptOutput, boolean isNonePin) throws RemoteException {
                                Log.e(TAG, "onConfirm, isNonePin->" + isNonePin);
                                if (pinDukptOutput != null) {
                                    Log.e(TAG, "onConfirm, ksn->" + StringUtil.byte2HexStr(pinDukptOutput.getKsnOut()));
                                    Log.e(TAG, "onConfirm, block->" + StringUtil.byte2HexStr(pinDukptOutput.getPinBlockOut()));
                                }
                                finish();
                            }

                            @Override
                            public void onError(int ret) throws RemoteException {
                                Log.e(TAG, "onError, ret->" + ret);
                                finish();
                            }

                            @Override
                            public void onInput(int len, int event) throws RemoteException {
                                Log.e(TAG, "onInput, ret->" + len + ",event->" + event);
                                Message msg = Message.obtain();
                                msg.what = ON_KEY_EVENT;
                                msg.arg1 = len;
                                msg.arg2 = event;
                                mInHandler.sendMessage(msg);
                            }
                        }
                );
            } catch (RemoteException e) {
                e.printStackTrace();
            }
        }

    }

    private void finishAct() {
        finish();
        overridePendingTransition(0, 0);
    }

    private List<CustomPinBtnLoc> getPinBtnLoc(Object[] buttonNum, Object buttonOK, Object buttonDel, Object buttonCancel) {
        List<CustomPinBtnLoc> btnLocs = new ArrayList<>();
        int i;
        for (i = 0; i < 10; ++i) {
            CustomPinBtnLoc loc = new CustomPinBtnLoc();
            loc.setKeyName(i + "");
            loc.setLeftX(this.getX((View) buttonNum[i], "left"));
            loc.setTopY(this.getY((View) buttonNum[i], "top"));
            loc.setRightX(this.getX((View) buttonNum[i], "right"));
            loc.setBottomY(this.getY((View) buttonNum[i], "bottom"));
            btnLocs.add(loc);
        }
        CustomPinBtnLoc cancelLoc = new CustomPinBtnLoc();
        cancelLoc.setKeyName("cancel");
        cancelLoc.setLeftX(this.getX((View) buttonCancel, "left"));
        cancelLoc.setTopY(this.getY((View) buttonCancel, "top"));
        cancelLoc.setRightX(this.getX((View) buttonCancel, "right"));
        cancelLoc.setBottomY(this.getY((View) buttonCancel, "bottom"));
        btnLocs.add(cancelLoc);

        CustomPinBtnLoc okLoc = new CustomPinBtnLoc();
        okLoc.setKeyName("ok");
        okLoc.setLeftX(this.getX((View) buttonOK, "left"));
        okLoc.setTopY(this.getY((View) buttonOK, "top"));
        okLoc.setRightX(this.getX((View) buttonOK, "right"));
        okLoc.setBottomY(this.getY((View) buttonOK, "bottom"));
        btnLocs.add(okLoc);

        CustomPinBtnLoc delLoc = new CustomPinBtnLoc();
        delLoc.setKeyName("delete");
        delLoc.setLeftX(this.getX((View) buttonDel, "left"));
        delLoc.setTopY(this.getY((View) buttonDel, "top"));
        delLoc.setRightX(this.getX((View) buttonDel, "right"));
        delLoc.setBottomY(this.getY((View) buttonDel, "bottom"));
        btnLocs.add(delLoc);
        return btnLocs;
    }

    private int getX(View view, String orientation) {
        int[] loc = {0, 0};    //默认圆点坐标
        int w;
        view.getLocationInWindow(loc);
        view.getLocationOnScreen(loc);

        w = view.getWidth();
        if (orientation.equals("left")) {
            return loc[0];
        } else if (orientation.equals("right")) {
            return (loc[0] + w);
        }
        return 0;

    }

    private int getY(View view, String orientation) {
        int[] loc = {0, 0};
        int h;
        view.getLocationInWindow(loc);
        view.getLocationOnScreen(loc);
        h = view.getHeight();
        if (orientation.equals("top")) {
            return loc[1];
        } else if (orientation.equals("bottom")) {
            return (loc[1] + h);
        }
        return 0;
    }

    /**
     * 合并字节数组
     *
     * @param list 需要合并的数组列表
     * @return 合并后的数组
     */
    public static byte[] concatByteArray(List<byte[]> list) {
        if (list == null || list.isEmpty()) {
            return new byte[0];
        }
        int totalLen = 0;
        for (byte[] b : list) {
            if (b == null || b.length == 0) {
                continue;
            }
            totalLen += b.length;
        }
        byte[] result = new byte[totalLen];
        int index = 0;
        for (byte[] b : list) {
            if (b == null || b.length == 0) {
                continue;
            }
            System.arraycopy(b, 0, result, index, b.length);
            index += b.length;
        }
        return result;
    }

    private void beep() {
        try {
            String model = DeviceServiceGet.getInstance().getDeviceInfo().getModel();
            if ("S200".equals(model)) {
                ToneUtil.getInstance().playBeep();
            }
        } catch (RemoteException e) {
            e.printStackTrace();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        super.onBackPressed();
    }
}
