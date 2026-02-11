package com.sunyard.sdkserviceinvokedemo;

import androidx.appcompat.app.AppCompatActivity;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Bundle;
import android.os.Environment;
import android.os.RemoteException;
import android.text.TextUtils;

import com.sunyard.api.printer.IPrinter;
import com.sunyard.api.printer.OnPrintListener;
import com.sunyard.api.printer.PrintConstant;
import com.sunyard.api.printer.PrinterChip;
import com.sunyard.sdkserviceinvokedemo.databinding.ActivityPrintBinding;
import com.sunyard.sdkserviceinvokedemo.service.DeviceServiceGet;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.util.ArrayList;

public class PrintActivity extends AppCompatActivity {
    ActivityPrintBinding binding;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityPrintBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        binding.btPrintVoucher.setOnClickListener(view -> {
            printVoucher();
        });
    }

    private void printVoucher() {
        setResult("starting printVoucher");
        try {
            IPrinter printer = DeviceServiceGet.getInstance().getPrinter();
            printer.setGray(10);

            ArrayList<PrinterChip> chips1 = new ArrayList<>();
            PrinterChip chip1 = new PrinterChip("Left", 0.5f, 0);
            chip1.setFontSize(2);
            chips1.add(chip1);
            PrinterChip chip2 = new PrinterChip("Right", 0.5f, 2);
            chip2.setFontSize(2);
            chips1.add(chip2);
            printer.addTextChips(chips1);

            ArrayList<PrinterChip> chips2 = new ArrayList<>();
            PrinterChip chip21 = new PrinterChip("Aaa", 0.3f, 0);
            chip21.setFontSize(1);
            chips2.add(chip21);
            PrinterChip chip22 = new PrinterChip("Bbb", 0.4f, 1);
            chip22.setFontSize(1);
            chips2.add(chip22);
            PrinterChip chip23 = new PrinterChip("Ccc", 0.3f, 2);
            chip23.setFontSize(1);
            chips2.add(chip23);
            printer.addTextChips(chips2);

            ArrayList<PrinterChip> chips3 = new ArrayList<>();
            PrinterChip chip31 = new PrinterChip("Aaa", 0.2f, 0);
            chip31.setFontSize(0);
            chips3.add(chip31);
            PrinterChip chip32 = new PrinterChip("Bbb", 0.3f, 1);
            chip32.setFontSize(0);
            chips3.add(chip32);
            PrinterChip chip33 = new PrinterChip("Ccc", 0.3f, 1);
            chip33.setFontSize(0);
            chips3.add(chip33);
            PrinterChip chip34 = new PrinterChip("Ddd", 0.2f, 2);
            chip34.setFontSize(0);
            chips3.add(chip34);
            printer.addTextChips(chips3);

            Bundle bundle0 = new Bundle();
            bundle0.putInt("offset", 72);
            Bitmap bitmap = BitmapFactory.decodeResource(getResources(), R.drawable.syd_log);
            DeviceServiceGet.getInstance().getPrinter().addImage(bundle0, bitmapToByteArray(bitmap));
            Bundle bundle = new Bundle();
            bundle.putInt("align", PrintConstant.Align.LEFT);
            bundle.putInt("font", PrintConstant.FontSize.NORMAL);
            bundle.putInt("fontTemplate", PrintConstant.FontTemplate.DEFAULT);
            printer.addText(bundle, "Transaction Type:SALE");
            printer.addText(bundle, "Terminal Name:Sunyard");
            printer.addText(bundle, "Terminal Num:3133001290");
            printer.addText(bundle, "Amount:100.00");
            printer.addText(bundle, "Transaction Time:");
            bundle.putInt("align", PrintConstant.Align.RIGHT);
            printer.addText(bundle, "2024/03/22 18:00:30");
            bundle.putInt("align", PrintConstant.Align.LEFT);

            Bundle bundle2 = new Bundle();
            bundle2.putInt("align", PrintConstant.Align.CENTER);
            bundle2.putInt("expectedHeight", 200);
            printer.addQrCode(bundle2,"https://www.sydtech.com.cn/en/");

            Bundle bundle3 = new Bundle();
            bundle3.putInt("align", PrintConstant.Align.CENTER);
            bundle3.putInt("width", 400);
            bundle3.putInt("height", 100);
            printer.addBarCode(bundle3,"6901234567890");

            printer.feedLine(6);
            printer.startPrint(new OnPrintListener.Stub() {
                @Override
                public void onFinish() throws RemoteException {
                    setResult("printVoucher onFinish");
                }

                @Override
                public void onError(int i) throws RemoteException {
                    setResult("printVoucher onError ret:" + i);
                }
            });
        } catch (RemoteException e) {
            e.printStackTrace();
            setResult("printVoucher RemoteException :" + e.getMessage());
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

    public static byte[] bitmapToByteArray(Bitmap bitmap) {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream);
        return outputStream.toByteArray();
    }
}