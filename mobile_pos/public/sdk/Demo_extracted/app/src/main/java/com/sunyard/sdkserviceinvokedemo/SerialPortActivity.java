package com.sunyard.sdkserviceinvokedemo;

import androidx.appcompat.app.AppCompatActivity;

import android.os.Bundle;
import android.text.TextUtils;

import com.sunyard.sdkserviceinvokedemo.R;
import com.sunyard.sdkserviceinvokedemo.databinding.ActivitySerialPortBinding;
import com.sunyard.sdkserviceinvokedemo.util.SerialPortUtil;
import com.sunyard.sdkserviceinvokedemo.util.StringUtil;

public class SerialPortActivity extends AppCompatActivity {

    ActivitySerialPortBinding binding;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivitySerialPortBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        binding.btOpenSerial.setOnClickListener(view -> {
            setResult("open:" + SerialPortUtil.openSerialPort());
        });
        binding.btWriteSerial.setOnClickListener(view -> {
            int len = SerialPortUtil.writeSerialPort();
            setResult("writeSerialPort:" + len);
        });
        binding.btReadSerial.setOnClickListener(view -> {
            int len = SerialPortUtil.readSerialPort();
            setResult("readSerialPort:" + len);
        });
        binding.btCloseSerial.setOnClickListener(view -> {
            setResult("close:" + SerialPortUtil.closeSerialPort());
        });
        binding.btIsBufferEmpty.setOnClickListener(view -> {
            setResult("is input buffer empty:" + SerialPortUtil.isInputBufferEmpty());
            setResult("is output buffer empty:" + SerialPortUtil.isOutputBufferEmpty());
        });
        binding.btClearBuffer.setOnClickListener(view -> {
            setResult("clear input buffer:" + SerialPortUtil.clearInputBuffer());
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