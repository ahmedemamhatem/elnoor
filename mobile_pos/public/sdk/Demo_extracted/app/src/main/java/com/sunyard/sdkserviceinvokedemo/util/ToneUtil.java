package com.sunyard.sdkserviceinvokedemo.util;

import android.app.Activity;
import android.content.Context;
import android.media.AudioManager;
import android.media.ToneGenerator;
import android.provider.Settings;
import android.util.Log;

public class ToneUtil {

    private ToneGenerator mToneGenerator;
    private Object mToneGeneratorLock = new Object();// 监视器对象锁
    private boolean mDTMFToneEnabled; // 按键操作音
    private static final int TONE_LENGTH_MS = 150;// 延迟时间
    private static final String TAG = "ToneUtil";

    private Context act = null;
    public static ToneUtil instance = null;

    public static ToneUtil getInstance() {
        if (instance == null) {
            instance = new ToneUtil();
        }
        return instance;
    }

    private ToneUtil() {
    };

    private void playTone(int tone) {
        // TODO 播放按键声音
        if (!mDTMFToneEnabled) {
            return;
        }
        // toneInit(act);
        AudioManager audioManager = (AudioManager) act.getSystemService(Context.AUDIO_SERVICE);
        int ringerMode = audioManager.getRingerMode();
        if ((ringerMode == AudioManager.RINGER_MODE_SILENT) || (ringerMode == AudioManager.RINGER_MODE_VIBRATE)) {// 静音或震动时不发出按键声音
            return;
        }

        synchronized (mToneGeneratorLock) {
            if (mToneGenerator == null) {
                Log.w(TAG, "playTone mToneGenerator == null, tone:" + tone);
                return;
            }
            mToneGenerator.startTone(tone, TONE_LENGTH_MS );// 发声
        }
    }

    private void toneInit(Context act) {
        // srv.set
        // this.act = act;
        mDTMFToneEnabled = Settings.System.getInt(act.getContentResolver(), Settings.System.DTMF_TONE_WHEN_DIALING, 1) == 1;// 获取系统参数“按键操作音”是否开启

        synchronized (mToneGeneratorLock) {
            if (mToneGenerator == null) {
                try {
                    mToneGenerator = new ToneGenerator(AudioManager.STREAM_MUSIC, ToneGenerator.MAX_VOLUME);
                    // act.setVolumeControlStream(AudioManager.STREAM_MUSIC);
                } catch (RuntimeException e) {
                    Log.w(TAG, "toneInit Exception caught while creating local tone generator");
                    e.printStackTrace();
                    mToneGenerator = null;
                }
            }
        }
    }

    public void setCtx(Context ctx) {
        act = ctx;
    }

    public void playBeep() {
        toneInit(act);
        playTone(1);
    }

    public void setAct(Activity act) {
        toneInit(act);
        this.act = act;
    }

}
