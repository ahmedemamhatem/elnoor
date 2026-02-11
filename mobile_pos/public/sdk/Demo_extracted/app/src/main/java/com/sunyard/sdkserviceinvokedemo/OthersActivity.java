package com.sunyard.sdkserviceinvokedemo;

import android.content.Context;
import android.content.Intent;
import android.media.AudioManager;
import android.os.Bundle;
import android.text.TextUtils;

import androidx.appcompat.app.AppCompatActivity;

import com.sunyard.sdkserviceinvokedemo.databinding.ActivityOthersBinding;

public class OthersActivity extends AppCompatActivity {

    ActivityOthersBinding binding;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityOthersBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        binding.btSystemVolume.setOnClickListener(view -> {
            AudioManager audioManager = (AudioManager) this.getSystemService(Context.AUDIO_SERVICE);
            audioManager.setStreamVolume(AudioManager.STREAM_SYSTEM,
                    10,/*0~15,0 is the lowest volume and 15 is the highest volume */
                    0/*if you don't want to show the view,you can pass 0*/);
            int volume = audioManager.getStreamVolume(AudioManager.STREAM_SYSTEM);
            setResult("SystemVolume is " + volume);
        });
        binding.btMusicVolume.setOnClickListener(view -> {
            AudioManager audioManager = (AudioManager) this.getSystemService(Context.AUDIO_SERVICE);
            audioManager.setStreamVolume(AudioManager.STREAM_MUSIC,
                    10,/*0~15,0 is the lowest volume and 15 is the highest volume */
                    AudioManager.FLAG_SHOW_UI);
            int volume = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC);
            setResult("MusicVolume is " + volume);
        });
        binding.btAlarmVolume.setOnClickListener(view -> {
            AudioManager audioManager = (AudioManager) this.getSystemService(Context.AUDIO_SERVICE);
            audioManager.setStreamVolume(AudioManager.STREAM_ALARM,
                    10, /*0~15,0 is the lowest volume and 15 is the highest volume */
                    AudioManager.FLAG_SHOW_UI);
            int volume = audioManager.getStreamVolume(AudioManager.STREAM_ALARM);
            setResult("AlarmVolume is " + volume);
        });
        binding.btOpenVolumeSetting.setOnClickListener(view -> {
            Intent intent = new Intent(android.provider.Settings.ACTION_SOUND_SETTINGS);
            this.startActivity(intent);
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
