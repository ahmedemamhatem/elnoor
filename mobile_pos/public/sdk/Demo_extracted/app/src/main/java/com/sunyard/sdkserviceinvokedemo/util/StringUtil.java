package com.sunyard.sdkserviceinvokedemo.util;

import android.os.Bundle;
import android.text.TextUtils;

import java.io.UnsupportedEncodingException;
import java.text.DecimalFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Date;

public class StringUtil {
    public static final String SEPARATOR_LINE = "|";
    public static final String SEPARATOR_LINE_SPLIT = "\\|";

    public StringUtil() {
    }

    public static boolean isEmpty(String var0) {
        return var0 == null?true:(var0.trim().equals("")?true:var0.trim().equals("null"));
    }

    public static boolean isNumber(String var0) {
        try {
            Float.parseFloat(var0);
            return true;
        } catch (Exception var2) {
            return false;
        }
    }

    public static boolean isEqualsByte(byte[] var0, int var1, byte[] var2, int var3) {
        byte[] var4 = new byte[var3];
        System.arraycopy(var0, var1, var4, 0, var3);
        return Arrays.equals(var4, var2);
    }

    public static String str2DateTime(String var0, String var1, String var2) {
        String var3 = "";

        try {
            Date var4 = (new SimpleDateFormat(var0)).parse(var2);
            var3 = (new SimpleDateFormat(var1)).format(var4);
        } catch (ParseException var6) {
            var6.printStackTrace();
        }

        return var3;
    }

    public static byte[] shortToByteArray(short var0) {
        byte[] var1 = new byte[]{(byte)(var0 & 255), (byte)((var0 & '\uff00') >> 8)};
        return var1;
    }

    public static byte[] shortToByteArrayTwo(short var0) {
        byte[] var1 = new byte[]{(byte)((var0 & '\uff00') >> 8), (byte)(var0 & 255)};
        return var1;
    }

    public static byte[] shortArrayToByteArray(short[] var0) {
        byte[] var1 = new byte[var0.length * 2];

        for(int var2 = 0; var2 < var0.length; ++var2) {
            byte[] var3 = shortToByteArray(var0[var2]);
            var1[2 * var2] = var3[0];
            var1[2 * var2 + 1] = var3[1];
        }

        return var1;
    }

    public static short[] byteArraytoShort(byte[] var0) {
        short[] var1 = new short[var0.length / 2];
        int var3 = 0;

        for(int var4 = 0; var4 < var0.length; var4 += 2) {
            short var2 = (short)(var0[var4] & 255);
            var2 |= (short)((short)var0[var4 + 1] << 8 & '\uff00');
            var1[var3++] = var2;
        }

        return var1;
    }

    public static String str2HexStr(String var0) {
        char[] var1 = "0123456789ABCDEF".toCharArray();
        StringBuilder var2 = new StringBuilder("");
        byte[] var3 = var0.getBytes();

        for(int var5 = 0; var5 < var3.length; ++var5) {
            int var4 = (var3[var5] & 240) >> 4;
            var2.append(var1[var4]);
            var4 = var3[var5] & 15;
            var2.append(var1[var4]);
            var2.append(' ');
        }

        return var2.toString().trim();
    }

    public static String hexStr2Str(String var0) {
        String var1 = "0123456789ABCDEF";
        char[] var2 = var0.toCharArray();
        byte[] var3 = new byte[var0.length() / 2];

        for(int var5 = 0; var5 < var3.length; ++var5) {
            int var4 = var1.indexOf(var2[2 * var5]) * 16;
            var4 += var1.indexOf(var2[2 * var5 + 1]);
            var3[var5] = (byte)(var4 & 255);
        }

        try {
            return new String(var3, "ISO-8859-1");
        } catch (UnsupportedEncodingException var6) {
            var6.printStackTrace();
            return "";
        }
    }

    public static byte[] str2bytesISO88591(String var0) {
        try {
            return var0.getBytes("ISO-8859-1");
        } catch (UnsupportedEncodingException var2) {
            var2.printStackTrace();
            return null;
        }
    }

    public static byte[] str2bytesGBK(String var0) {
        try {
            return var0.getBytes("GBK");
        } catch (UnsupportedEncodingException var2) {
            var2.printStackTrace();
            return null;
        }
    }

    public static String byteToGBK(byte[] var0) {
        String var1 = "";

        try {
            var1 = new String(var0, "GBK");
        } catch (UnsupportedEncodingException var3) {
            var3.printStackTrace();
        }

        return var1;
    }

    public static String byte2HexStr(byte[] var0) {
        if(var0 == null) {
            return "";
        } else {
            String var1 = "";
            StringBuilder var2 = new StringBuilder("");

            for(int var3 = 0; var3 < var0.length; ++var3) {
                var1 = Integer.toHexString(var0[var3] & 255);
                var2.append(var1.length() == 1?"0" + var1:var1);
            }

            return var2.toString().toUpperCase().trim();
        }
    }

    public static String byte2HexStr(byte var0) {
        byte[] var1 = new byte[]{var0};
        String var2 = "";
        StringBuilder var3 = new StringBuilder("");

        for(int var4 = 0; var4 < var1.length; ++var4) {
            var2 = Integer.toHexString(var1[var4] & 255);
            var3.append(var2.length() == 1?"0" + var2:var2);
        }

        return var3.toString().toUpperCase().trim();
    }

    public static byte[] hexStr2Bytes(String var0) {
        if(TextUtils.isEmpty(var0)) {
            return null;
        } else {
            boolean var1 = false;
            boolean var2 = false;
            if(var0.length() % 2 != 0) {
                var0 = "0" + var0;
            }

            int var3 = var0.length() / 2;
            byte[] var4 = new byte[var3];

            for(int var5 = 0; var5 < var3; ++var5) {
                int var6 = var5 * 2 + 1;
                int var7 = var6 + 1;
                var4[var5] = Integer.decode("0x" + var0.substring(var5 * 2, var6) + var0.substring(var6, var7)).byteValue();
            }

            return var4;
        }
    }

    public static String strToUnicode(String var0) throws Exception {
        StringBuilder var2 = new StringBuilder();

        for(int var5 = 0; var5 < var0.length(); ++var5) {
            char var1 = var0.charAt(var5);
            String var4 = Integer.toHexString(var1);
            if(var1 > 128) {
                var2.append("\\u" + var4);
            } else {
                var2.append("\\u00" + var4);
            }
        }

        return var2.toString();
    }

    public static String unicodeToString(String var0) {
        int var1 = var0.length() / 6;
        StringBuilder var2 = new StringBuilder();

        for(int var3 = 0; var3 < var1; ++var3) {
            String var4 = var0.substring(var3 * 6, (var3 + 1) * 6);
            String var5 = var4.substring(2, 4) + "00";
            String var6 = var4.substring(4);
            int var7 = Integer.valueOf(var5, 16).intValue() + Integer.valueOf(var6, 16).intValue();
            char[] var8 = Character.toChars(var7);
            var2.append(new String(var8));
        }

        return var2.toString();
    }

    public static int byteToInt(byte[] var0) {
        int var1 = 0;

        for(int var2 = 0; var2 < var0.length; ++var2) {
            var1 += var0[var2] << var2 * 8 & 255 << var2 * 8;
        }

        return var1;
    }

    public static byte[] intToByte(int var0) {
        byte[] var1 = new byte[4];

        for(int var2 = 0; var2 < var1.length; ++var2) {
            var1[var2] = (byte)(var0 >> var2 * 8 & 255);
        }

        return var1;
    }

    public static byte[] intToBytes2(int var0) {
        byte[] var1 = new byte[]{(byte)(var0 >> 24 & 255), (byte)(var0 >> 16 & 255), (byte)(var0 >> 8 & 255), (byte)(var0 & 255)};
        return var1;
    }

    public static byte[] intToByte1024(int var0) {
        byte[] var1 = new byte[1024];

        for(int var2 = 0; var2 < var1.length; ++var2) {
            var1[var2] = (byte)(var0 >> var2 * 8 & 255);
        }

        return var1;
    }

    public static byte[] hexString2Bytes(String var0) {
        int var1 = var0.length() / 2;
        byte[] var2 = new byte[var1];

        for(int var3 = 0; var3 < var1; ++var3) {
            var2[var3] = Integer.valueOf(var0.substring(var3 * 2, var3 * 2 + 2), 16).byteValue();
        }

        return var2;
    }

    public static String byteToStr(byte[] var0) {
        String var1 = "";

        try {
            var1 = new String(var0, "ISO-8859-1");
        } catch (UnsupportedEncodingException var3) {
            var3.printStackTrace();
        }

        return var1;
    }

    public static byte[] hexStringToByte(String var0) {
        int var1 = var0.length() / 2;
        byte[] var2 = new byte[var1];
        char[] var3 = var0.toCharArray();

        for(int var4 = 0; var4 < var1; ++var4) {
            int var5 = var4 * 2;
            var2[var4] = (byte)(toByte(var3[var5]) << 4 | toByte(var3[var5 + 1]));
        }

        return var2;
    }

    private static byte toByte(char var0) {
        byte var1 = (byte)"0123456789ABCDEF".indexOf(var0);
        return var1;
    }

    public static final String bytesToHexString(byte[] var0) {
        StringBuffer var1 = new StringBuffer(var0.length);

        for(int var3 = 0; var3 < var0.length; ++var3) {
            String var2 = Integer.toHexString(255 & var0[var3]);
            if(var2.length() < 2) {
                var1.append(0);
            }

            var1.append(var2.toUpperCase());
        }

        return var1.toString();
    }

    public static byte[] intToByteArray(int var0) {
        byte[] var1 = new byte[]{(byte)(var0 & 255), (byte)(var0 >> 8 & 255), (byte)(var0 >> 16 & 255), (byte)(var0 >> 24 & 255)};
        return var1;
    }

    public static int byteArrayToInt(byte[] var0) {
        boolean var1 = false;
        int var2 = var0[0] & 255 | var0[1] << 8 & '\uffff' | var0[2] << 16 & 16777215 | var0[3] << 24 & -1;
        return var2;
    }

    public static byte[] formatWithZero(byte[] var0) {
        int var1 = 0;

        for(int var2 = 0; var2 < var0.length; ++var2) {
            if(var0[var2] == 0) {
                var1 = var2;
                break;
            }
        }

        if(var1 == 0) {
            var1 = var0.length;
        }

        byte[] var3 = new byte[var1];
        System.arraycopy(var0, 0, var3, 0, var1);
        return var3;
    }

    public static String insertComma(String var0, int var1) {
        if(var0 != null && var0.length() >= 1) {
            DecimalFormat var2 = null;
            double var3 = Double.parseDouble(var0);
            if(var1 == 0) {
                var2 = new DecimalFormat("###,###");
            } else {
                StringBuffer var5 = new StringBuffer();
                var5.append("###,###.");

                for(int var6 = 0; var6 < var1; ++var6) {
                    var5.append("#");
                }

                var2 = new DecimalFormat(var5.toString());
            }

            return var2.format(var3);
        } else {
            return "";
        }
    }

    public static String showBundleData(Bundle bundle) {
        if (bundle == null) {
            return "null";
        }
        String string = "{";
        for (String key : bundle.keySet()) {
            string += " " + key + " => " + bundle.get(key) + ";";
        }
        string += " }";
        // PaxLog.d(TAG, "showBundleData", string);
        return string;
    }

    public static void main(String[] var0) {
        System.out.println(byteToInt(new byte[]{0, 16}));
    }
}
