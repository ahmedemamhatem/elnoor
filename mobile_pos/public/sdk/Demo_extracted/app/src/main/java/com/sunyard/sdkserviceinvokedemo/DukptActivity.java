package com.sunyard.sdkserviceinvokedemo;

import android.content.Intent;
import android.os.Bundle;
import android.os.RemoteException;
import android.text.TextUtils;
import android.util.Log;

import androidx.appcompat.app.AppCompatActivity;

import com.sunyard.api.dukpt.DukptAesOutput;
import com.sunyard.api.dukpt.DukptConstant;
import com.sunyard.api.dukpt.DukptDesOutput;
import com.sunyard.api.dukpt.MacDukptAesOutput;
import com.sunyard.api.dukpt.MacDukptOutput;
import com.sunyard.api.dukpt.OnDukptPinListener;
import com.sunyard.api.dukpt.PinDukptOutput;
import com.sunyard.api.pinpad.OnInputPinListener;
import com.sunyard.api.pinpad.PedConstant;
import com.sunyard.sdkserviceinvokedemo.databinding.ActivityDukptBinding;
import com.sunyard.sdkserviceinvokedemo.service.DeviceServiceGet;
import com.sunyard.sdkserviceinvokedemo.util.StringUtil;

import java.util.Arrays;

public class DukptActivity extends AppCompatActivity {

    ActivityDukptBinding binding;
    private final String TAG = "DukptActivity_SYD";
    private final static int DUKPT_INDEX = 1;
    private final static int DUKPT_AES_INDEX = 2;
    private String testCardNo = "1234813360298927";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityDukptBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        binding.btResetPed.setOnClickListener(view -> {
            resetPed();
        });
        binding.btWriteMkey.setOnClickListener(view -> {
            writeDukptKey();
        });
        binding.btWriteAesMkey.setOnClickListener(view -> {
            writeAesDukptKey();
        });
        binding.btGetKcv.setOnClickListener(view -> {
            try {
                byte[] kcv = DeviceServiceGet.getInstance().getDukpt().pedGetKcv(DUKPT_INDEX, 0);
                setResult("dukpt kcv:" + (kcv == null ? "null" : StringUtil.byte2HexStr(kcv)));
            } catch (RemoteException e) {
                e.printStackTrace();
            }
        });
        binding.btAesGetkcv.setOnClickListener(view -> {
            try {
                byte[] kcv = DeviceServiceGet.getInstance().getDukpt().pedAesGetKcv(DUKPT_AES_INDEX, 0);
                setResult("aes dukpt kcv:" + (kcv == null ? "null" : StringUtil.byte2HexStr(kcv)));
            } catch (RemoteException e) {
                e.printStackTrace();
            }
        });
        binding.btIncreaseKsn.setOnClickListener(view -> {
            try {
                DeviceServiceGet.getInstance().getDukpt().pedDukptIncreaseKsn((byte) DUKPT_INDEX);
            } catch (RemoteException e) {
                e.printStackTrace();
            }
        });
        binding.btAesIncreaseKsn.setOnClickListener(view -> {
            try {
                DeviceServiceGet.getInstance().getDukpt().pedAesDukptIncreaseKsn((byte) DUKPT_AES_INDEX);
            } catch (RemoteException e) {
                e.printStackTrace();
            }
        });
        binding.btGetKsn.setOnClickListener(view -> {
            try {
                byte[] ksn = DeviceServiceGet.getInstance().getDukpt().pedGetDukptKSN((byte) DUKPT_INDEX);
                setResult("dukpt ksn:" + (ksn != null ? StringUtil.byte2HexStr(ksn) : "null"));
            } catch (RemoteException e) {
                e.printStackTrace();
                setResult("dukpt getksn error:" + e.getMessage());
            }
        });

        binding.btGetAesKsn.setOnClickListener(view -> {
            try {
                byte[] ksn = DeviceServiceGet.getInstance().getDukpt().pedAesDukptGetKSN((byte) DUKPT_AES_INDEX);
                setResult("aes dukpt ksn:" + (ksn != null ? StringUtil.byte2HexStr(ksn) : "null"));
            } catch (RemoteException e) {
                e.printStackTrace();
                setResult("aes dukpt getksn error:" + e.getMessage());
            }
        });

        binding.btCalData.setOnClickListener(view -> {
            calData(DukptConstant.CalKeyType.DUKPT_KEY_MAC, DukptConstant.CalMode.ECB_EN);
            calData(DukptConstant.CalKeyType.DUKPT_KEY_DES, DukptConstant.CalMode.ECB_EN);
            calData(DukptConstant.CalKeyType.DUKPT_KEY_DES_RESPONSE, DukptConstant.CalMode.ECB_EN);
            calData(DukptConstant.CalKeyType.DUKPT_KEY_PIN, DukptConstant.CalMode.ECB_EN);

//            calData(DukptConstant.CalKeyType.DUKPT_KEY_MAC, DukptConstant.CalMode.CBC_EN);
//            calData(DukptConstant.CalKeyType.DUKPT_KEY_DES, DukptConstant.CalMode.CBC_EN);
//            calData(DukptConstant.CalKeyType.DUKPT_KEY_DES_RESPONSE, DukptConstant.CalMode.CBC_EN);
//            calData(DukptConstant.CalKeyType.DUKPT_KEY_PIN, DukptConstant.CalMode.CBC_EN);
        });
        binding.btAesCalData.setOnClickListener(view -> {
            aesCalData(DukptConstant.CalKeyType.DUKPT_KEY_MAC, DukptConstant.CalMode.AES_ECB_EN);
            aesCalData(DukptConstant.CalKeyType.DUKPT_KEY_DES, DukptConstant.CalMode.AES_ECB_EN);
            aesCalData(DukptConstant.CalKeyType.DUKPT_KEY_DES_RESPONSE, DukptConstant.CalMode.AES_ECB_EN);
            aesCalData(DukptConstant.CalKeyType.DUKPT_KEY_PIN, DukptConstant.CalMode.AES_ECB_EN);

//            aesCalData(DukptConstant.CalKeyType.DUKPT_KEY_MAC, DukptConstant.CalMode.AES_CBC_EN);
//            aesCalData(DukptConstant.CalKeyType.DUKPT_KEY_DES, DukptConstant.CalMode.AES_CBC_EN);
//            aesCalData(DukptConstant.CalKeyType.DUKPT_KEY_DES_RESPONSE, DukptConstant.CalMode.AES_CBC_EN);
//            aesCalData(DukptConstant.CalKeyType.DUKPT_KEY_PIN, DukptConstant.CalMode.AES_CBC_EN);
        });

        binding.btCalMac.setOnClickListener(view -> {
            getMac(DukptConstant.MacMode.BOTH_AUTO_INCREASE_ECB);
        });
        binding.btAesCalMac.setOnClickListener(view -> {
            getAesMac(DukptConstant.MacMode.BOTH_AUTO_INCREASE_ECB);
        });

        binding.btGetPin.setOnClickListener(view -> {
            startDukptPinInput(DukptConstant.PinAlgorithm.ISO9564_FMT_0_KSN_INC);
        });
        binding.btGetAesPin.setOnClickListener(view -> {
            startAesDukptPinInput(DukptConstant.PinAlgorithm.ISO9564_FMT_0_KSN_INC);
        });
        binding.btGetDukptCustomPin.setOnClickListener(view -> {
            Intent intent = new Intent(DukptActivity.this, CustomizePinActivity.class);
            intent.putExtra("keyIndex", DUKPT_INDEX);
            intent.putExtra("isDukpt", true);
            intent.putExtra("isDukptAes", false);//if use aes dukpt key, you need set this to true.
            intent.putExtra("isOnline", true);//if you want enter offline pin, set this to false.
            intent.putExtra("isKeyRandom", false);//if you want to random key num, set this to true.
            int mode = DukptConstant.PinAlgorithm.ISO9564_FMT_0_KSN_INC;
            intent.putExtra("mode", mode);
            intent.putExtra("cardNo", testCardNo);
            startActivity(intent);
        });

        binding.btLoadDukptTr31.setOnClickListener(view -> {
            writeDukptTr31Key();
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

    private void writeDukptKey() {
        try {
            Bundle bundle = new Bundle();
            bundle.putByteArray("checkBuf", StringUtil.hexString2Bytes("60C15261"));
            boolean ret = DeviceServiceGet.getInstance().getDukpt().pedDukptWriteTIK((byte) DUKPT_INDEX, (byte) 0,
                    StringUtil.hexString2Bytes("12345678901234567890123456789012"),
                    StringUtil.hexString2Bytes("FFFFF022000200000001"), bundle);
            setResult("load dukpt key " + ret);
        } catch (RemoteException e) {
            e.printStackTrace();
            setResult("load dukpt key failure");
        }
    }

    private void writeAesDukptKey() {
        try {
            Bundle bundle = new Bundle();
            //bundle.putByteArray("checkBuf", StringUtil.hexString2Bytes("60C15261"));
            bundle.putByteArray("checkBuf", StringUtil.hexString2Bytes("02A7E968"));
            boolean ret = DeviceServiceGet.getInstance().getDukpt().pedAesDukptWriteTIK((byte) DUKPT_AES_INDEX, (byte) 0,
                    StringUtil.hexString2Bytes("12345678901234567890123456789012"),
                    StringUtil.hexString2Bytes("FFFFF022000200000001"), bundle);
            setResult("load aes dukpt key " + ret);
        } catch (RemoteException e) {
            e.printStackTrace();
            setResult("load aes dukpt key failure");
        }
    }

    private void loadTEK_tr31(boolean isAes) {
        try {
            boolean isExist = DeviceServiceGet.getInstance().getPinpad().isKeyExist(PedConstant.KeyType.PED_TEK, 1);
            if (!isExist) {
                boolean ret = DeviceServiceGet.getInstance().getPinpad().loadTEK(
                        StringUtil.hexString2Bytes("CBB51A7F4FE3F825D54C08E320DFCB31"), isAes ? 1 : 0,
                        null
                );
                Log.d(TAG, "load tek->" + ret);
                setResult("load tek " + (ret ? "successful" : "failure"));
            } else {
                setResult("tek is exist.");
            }
        } catch (RemoteException e) {
            e.printStackTrace();
            setResult("load tek exception");
        }
    }

    private void writeDukptTr31Key() {
        loadTEK_tr31(false);
        try {
            boolean ret = DeviceServiceGet.getInstance().getDukpt().pedWriteTr31TIK(0, (byte) DUKPT_INDEX, (byte) 0,
                    "B0080B1TX00N0000572DD35568AB7972D61FCA2B5EECAD34CE26C864819DDBF70855D1569F916E04".getBytes(),
                    StringUtil.hexString2Bytes("79123764611408E00001"));
            setResult("load dukpt tr31 key " + ret);
            byte[] kcv = DeviceServiceGet.getInstance().getDukpt().pedGetKcv(DUKPT_INDEX, 0);
            setResult("dukpt kcv:" + (kcv == null ? "null" : StringUtil.byte2HexStr(kcv)));
        } catch (RemoteException e) {
            e.printStackTrace();
            setResult("load dukpt tr31 key failure");
        }
    }

    private void calData(byte keyType, byte mode) {
        byte[] pubIc = StringUtil.hexString2Bytes("3132333435363738");
        //byte[] pubIc = null;
        try {
            DukptDesOutput desOutput = DeviceServiceGet.getInstance().getDukpt().pedDukptDataCalc((byte) DUKPT_INDEX, keyType,
                    pubIc, StringUtil.hexString2Bytes(Constant.PED_CAL_DATA), mode);
            setResult("desout: " + (desOutput == null ? "null" : "not null"));
            if (desOutput != null) {
                setResult("ksn:" + StringUtil.byte2HexStr(desOutput.getKsnOut()));
                setResult("result:" + StringUtil.byte2HexStr(desOutput.getDataOut()));
                Log.e(TAG, "ksn:" + StringUtil.byte2HexStr(desOutput.getKsnOut()));
                Log.e(TAG, "result:" + StringUtil.byte2HexStr(desOutput.getDataOut()));
                if (mode == DukptConstant.CalMode.ECB_EN || mode == DukptConstant.CalMode.CBC_EN) {
                    byte mode_de = DukptConstant.CalMode.ECB_DE;
                    if (mode == DukptConstant.CalMode.CBC_EN) {
                        mode_de = DukptConstant.CalMode.CBC_DE;
                    }
                    DukptDesOutput desOutput_de = DeviceServiceGet.getInstance().getDukpt().pedDukptDataCalc((byte) DUKPT_INDEX, keyType,
                            pubIc, desOutput.getDataOut(), mode_de);
                    setResult("decrypt out: " + (desOutput_de == null ? "null" : "not null"));
                    if (desOutput_de != null) {
                        setResult("ksn:" + StringUtil.byte2HexStr(desOutput_de.getKsnOut()));
                        setResult("decryption result:" + StringUtil.byte2HexStr(desOutput_de.getDataOut()));
                        Log.e(TAG, "ksn:" + StringUtil.byte2HexStr(desOutput_de.getKsnOut()));
                        Log.e(TAG, "decryption result:" + StringUtil.byte2HexStr(desOutput_de.getDataOut()));
                    }
                }
            }
        } catch (RemoteException e) {
            e.printStackTrace();
            setResult("pedDukptDataCalc throw exception");
        }
    }

    private void calData(byte keyType, byte mode, byte[] data) {
        byte[] pubIc = null;
        try {
            DukptDesOutput desOutput = DeviceServiceGet.getInstance().getDukpt().pedDukptDataCalc((byte) DUKPT_INDEX, keyType,
                    pubIc, data, mode);
            setResult("desout: " + (desOutput == null ? "null" : "not null"));
            if (desOutput != null) {
                setResult("ksn:" + StringUtil.byte2HexStr(desOutput.getKsnOut()));
                setResult("result:" + StringUtil.byte2HexStr(desOutput.getDataOut()));
                Log.e(TAG, "ksn:" + StringUtil.byte2HexStr(desOutput.getKsnOut()));
                Log.e(TAG, "result:" + StringUtil.byte2HexStr(desOutput.getDataOut()));
            }
        } catch (RemoteException e) {
            e.printStackTrace();
            setResult("pedDukptDataCalc throw exception");
        }
    }

    private void getMac(byte mode) {
        try {
            MacDukptOutput output = DeviceServiceGet.getInstance().getDukpt().pedGetMacDukpt((byte) DUKPT_INDEX,
                    StringUtil.hexString2Bytes(Constant.PED_CAL_MAC), mode);
            setResult("macOutput: " + (output == null ? "null" : "not null"));
            if (output != null) {
                setResult("ksn:" + StringUtil.byte2HexStr(output.getKsnOut()));
                setResult("result:" + StringUtil.byte2HexStr(output.getMacOut()));
                Log.e(TAG, "ksn:" + StringUtil.byte2HexStr(output.getKsnOut()));
                Log.e(TAG, "result:" + StringUtil.byte2HexStr(output.getMacOut()));
            }
        } catch (RemoteException e) {
            e.printStackTrace();
            setResult("pedGetMacDukpt throw exception");
        }
    }

    private void aesCalData(byte keyType, byte mode) {
        byte[] pubIc = StringUtil.hexString2Bytes("31323334353637383940414243444546");
//        byte[] pubIc = null;
        try {
            DukptAesOutput desOutput = DeviceServiceGet.getInstance().getDukpt().pedAesDukptDataCalc((byte) DUKPT_AES_INDEX, keyType,
                    pubIc, StringUtil.hexString2Bytes(Constant.PED_CAL_DATA), 0, mode);
            setResult("aes desout: " + (desOutput == null ? "null" : "not null"));
            if (desOutput != null) {
                setResult("ksn:" + StringUtil.byte2HexStr(desOutput.getKsnOut()));
                setResult("result:" + StringUtil.byte2HexStr(desOutput.getDataOut()));
                Log.e(TAG, "ksn:" + StringUtil.byte2HexStr(desOutput.getKsnOut()));
                Log.e(TAG, "result:" + StringUtil.byte2HexStr(desOutput.getDataOut()));
                if (mode == DukptConstant.CalMode.ECB_EN || mode == DukptConstant.CalMode.CBC_EN
                        || mode == DukptConstant.CalMode.AES_ECB_EN || mode == DukptConstant.CalMode.AES_CBC_EN) {
                    byte mode_de = DukptConstant.CalMode.ECB_DE;
                    if (mode == DukptConstant.CalMode.ECB_EN) {
                        mode_de = DukptConstant.CalMode.ECB_DE;
                    } else if (mode == DukptConstant.CalMode.CBC_EN) {
                        mode_de = DukptConstant.CalMode.CBC_DE;
                    } else if (mode == DukptConstant.CalMode.AES_ECB_EN) {
                        mode_de = DukptConstant.CalMode.AES_ECB_DE;
                    } else if (mode == DukptConstant.CalMode.AES_CBC_EN) {
                        mode_de = DukptConstant.CalMode.AES_CBC_DE;
                    }
                    DukptAesOutput desOutput_de = DeviceServiceGet.getInstance().getDukpt().pedAesDukptDataCalc((byte) DUKPT_AES_INDEX, keyType,
                            pubIc, desOutput.getDataOut(), 0, mode_de);
                    setResult("aes decryption out: " + (desOutput_de == null ? "null" : "not null"));
                    if (desOutput_de != null) {
                        setResult("ksn:" + StringUtil.byte2HexStr(desOutput_de.getKsnOut()));
                        setResult("decryption result:" + StringUtil.byte2HexStr(desOutput_de.getDataOut()));
                        Log.e(TAG, "ksn:" + StringUtil.byte2HexStr(desOutput_de.getKsnOut()));
                        Log.e(TAG, "decryption result:" + StringUtil.byte2HexStr(desOutput_de.getDataOut()));
                    }
                }
            }
        } catch (RemoteException e) {
            e.printStackTrace();
            setResult("pedAesDukptDataCalc throw exception");
        }
    }

    private void getAesMac(byte mode) {
        try {
            MacDukptAesOutput output = DeviceServiceGet.getInstance().getDukpt().pedAesDukptGetMac((byte) DUKPT_AES_INDEX,
                    StringUtil.hexString2Bytes(Constant.PED_CAL_MAC), 0, mode);
            setResult("macOutput: " + (output == null ? "null" : "not null"));
            if (output != null) {
                setResult("ksn:" + StringUtil.byte2HexStr(output.getKsnOut()));
                setResult("result:" + StringUtil.byte2HexStr(output.getMacOut()));
                Log.e(TAG, "ksn:" + StringUtil.byte2HexStr(output.getKsnOut()));
                Log.e(TAG, "result:" + StringUtil.byte2HexStr(output.getMacOut()));
            }
        } catch (RemoteException e) {
            e.printStackTrace();
            setResult("pedGetMacDukpt throw exception");
        }
    }

    private void startDukptPinInput(int mode) {
        setResult("===>startDukptPinInput");
        Bundle pinBundle = new Bundle();
        pinBundle.putBoolean("isOnline", true);
        pinBundle.putByteArray("panBlock", testCardNo.getBytes());
        pinBundle.putByteArray("pinLimit", new byte[]{0x00, 0x04, 0x06});
        pinBundle.putInt("timeout", 60);
        pinBundle.putInt("mode", mode);
        pinBundle.putBoolean("isKeyRandom", false);//false:num keys random arrangement
        pinBundle.putString("prompt", "Please enter the password");
        try {
            int ret = DeviceServiceGet.getInstance().getDukpt().pedGetPinDukpt((byte) DUKPT_INDEX, pinBundle, new OnDukptPinListener.Stub() {
                @Override
                public void onCancel() throws RemoteException {
                    Log.d(TAG, "onCancel-->");
                    setResult("pin onCancel");
                }

                @Override
                public void onConfirm(PinDukptOutput pinDukptOutput, boolean isNonePin) throws RemoteException {
                    Log.d(TAG, "onConfirm-->" + isNonePin);
                    setResult("dukpt pin onConfirm,  isNonePin:" + isNonePin);
                    if (pinDukptOutput != null && !isNonePin) {
                        setResult("pin onConfirm pinResult:" + StringUtil.byte2HexStr(pinDukptOutput.getPinBlockOut()) + "," + StringUtil.byte2HexStr(pinDukptOutput.getKsnOut()));
                        Log.d(TAG, "dukpt pinResult is not null");
                    }
                }

                @Override
                public void onError(int ret) throws RemoteException {
                    setResult("pin onError, ret:" + ret);
                }

                @Override
                public void onInput(int i, int i1) throws RemoteException {
                    setResult("pin onInput, " + i + ", " + i1);
                }
            });
            setResult("pin start pin, ret->" + ret);
        } catch (RemoteException e) {
            e.printStackTrace();
        }
    }

    private void startAesDukptPinInput(int mode) {
        setResult("===>startAesDukptPinInput");
        Bundle pinBundle = new Bundle();
        pinBundle.putBoolean("isOnline", true);
        pinBundle.putByteArray("panBlock", testCardNo.getBytes());
        pinBundle.putByteArray("pinLimit", new byte[]{0x00, 0x04, 0x06});
        pinBundle.putInt("timeout", 60);
        pinBundle.putInt("mode", mode);
        pinBundle.putBoolean("isKeyRandom", false);//false:num keys random arrangement
        pinBundle.putString("prompt", "Please enter the password");
        try {
            int ret = DeviceServiceGet.getInstance().getDukpt().pedAesDukptGetPin((byte) DUKPT_AES_INDEX, pinBundle, new OnDukptPinListener.Stub() {
                @Override
                public void onCancel() throws RemoteException {
                    Log.d(TAG, "onCancel-->");
                    setResult("pin onCancel");
                }

                @Override
                public void onConfirm(PinDukptOutput pinDukptOutput, boolean isNonePin) throws RemoteException {
                    Log.d(TAG, "onConfirm-->" + isNonePin);
                    setResult("aes dukpt pin onConfirm,  isNonePin:" + isNonePin);
                    if (pinDukptOutput != null && !isNonePin) {
                        setResult("pin onConfirm pinResult:" + StringUtil.byte2HexStr(pinDukptOutput.getPinBlockOut()) + "," + StringUtil.byte2HexStr(pinDukptOutput.getKsnOut()));
                        Log.d(TAG, "aes dukpt pinResult is not null");
                    }
                }

                @Override
                public void onError(int ret) throws RemoteException {
                    setResult("aes pin onError, ret:" + ret);
                }

                @Override
                public void onInput(int i, int i1) throws RemoteException {
                    setResult("aes pin onInput, " + i + ", " + i1);
                }
            });
            setResult("aes pin start pin, ret->" + ret);
        } catch (RemoteException e) {
            e.printStackTrace();
        }
    }
}