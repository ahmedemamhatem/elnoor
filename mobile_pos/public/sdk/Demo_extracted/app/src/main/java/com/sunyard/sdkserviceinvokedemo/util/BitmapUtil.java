package com.sunyard.sdkserviceinvokedemo.util;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.os.Handler;
import android.os.Looper;
import android.view.View;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;

public class BitmapUtil {

    public interface OnFadeStepListener {
        void onBitmapReady(Bitmap fadedBitmap);
    }
    public static byte[] bitmapToByteArray(Bitmap bitmap) {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream);
        return outputStream.toByteArray();
    }

    public static byte[] bitmapToBytesWithSize(Bitmap image) {
        if (image == null) return null;

        // The first 8 bytes store width and height (4 bytes width + 4 bytes height)
        int width = image.getWidth();
        int height = image.getHeight();
        int pixelSize = image.getConfig() == Bitmap.Config.ARGB_8888 ? 4 : 2;
        int imageBytes = width * height * pixelSize;
        int totalBytes = 8 + imageBytes;

        ByteBuffer buffer = ByteBuffer.allocate(totalBytes);
        buffer.putInt(width);
        buffer.putInt(height);
        image.copyPixelsToBuffer(buffer);
        return buffer.array();
    }

    public static Bitmap getLandscapeBitmapFromLayout(View view) {
        // Set the horizontal screen size (320x240)
        int width = 320;
        int height = 240;

        // Measure and layout
        view.measure(
                View.MeasureSpec.makeMeasureSpec(width, View.MeasureSpec.EXACTLY),
                View.MeasureSpec.makeMeasureSpec(height, View.MeasureSpec.EXACTLY)
        );
        view.layout(0, 0, width, height);

        // Create Bitmap
        Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        view.draw(canvas);

        return bitmap;
    }

    /**
     * Fade two Bitmaps in and out, duration duration milliseconds
     */
    public static void fadeBitmaps(
            Bitmap bitmapOld,
            Bitmap bitmapNew,
            int durationMs,
            int stepCount,
            OnFadeStepListener listener) {

        Handler handler = new Handler(Looper.getMainLooper());
        for (int i = 0; i <= stepCount; i++) {
            final int alpha = i;
            handler.postDelayed(() -> {
                Bitmap blended = blendBitmaps(bitmapOld, bitmapNew, alpha / (float) stepCount);
                listener.onBitmapReady(blended);
            }, i * (durationMs / stepCount));
        }
    }

    /**
     * Mix two bitmaps, progress range [0, 1]
     */
    private static Bitmap blendBitmaps(Bitmap from, Bitmap to, float progress) {
        Bitmap result = Bitmap.createBitmap(from.getWidth(), from.getHeight(), Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(result);

        Paint paint = new Paint();
        paint.setAlpha((int) ((1 - progress) * 255));
        canvas.drawBitmap(from, 0, 0, paint);

        paint.setAlpha((int) (progress * 255));
        canvas.drawBitmap(to, 0, 0, paint);

        return result;
    }
}
