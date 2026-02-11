package com.sunyard.sdkserviceinvokedemo.util;

import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Map.Entry;

public class TlvUtil {
    public static final int CODE_VALUE_OVERLENGTH = 51;
    public static final int CODE_LENGTH_OVERLENGTH = 52;
    public static final int CODE_PARAMS_INEXISTENCE = 53;

    public TlvUtil() {
    }

    public static Map<String, String> tlvToMap(String var0) {
        return (Map)(var0 == null?new HashMap():tlvToMap(hexStringToByte(var0)));
    }

    public static String mapToTlvStr(Map<String, String> var0) {
        return bcd2str(mapToTlv(var0));
    }

    public static byte[] mapToTlv(Map<String, String> var0) {
        if(var0 == null) {
            return new byte[0];
        } else {
            int var1 = 0;
            Iterator var2 = var0.entrySet().iterator();

            while(var2.hasNext()) {
                Entry var3 = (Entry)var2.next();
                if(var3.getValue() != null) {
                    int var4 = ((String)var3.getValue()).length() / 2;
                    if(var4 > 0) {
                        if(var4 > '\uffff') {
                            throw new RuntimeException("value length should not exceed 65535*2");
                        }

                        if(var4 <= 127) {
                            var1 += 2;
                        }

                        if(var4 > 127 && var4 <= 255) {
                            var1 += 4;
                        }

                        if(var4 > 255 && var4 <= '\uffff') {
                            var1 += 6;
                        }

                        var1 += ((String)var3.getValue()).length();
                        var1 += ((String)var3.getKey()).length();
                    }
                }
            }

            byte[] var9 = new byte[var1 / 2];
            int var10 = 0;
            Iterator var11 = var0.entrySet().iterator();

            while(var11.hasNext()) {
                Entry var5 = (Entry)var11.next();
                if(var5.getValue() != null) {
                    byte[] var6 = hexStringToByte((String)var5.getValue());
                    int var7 = var6.length;
                    if(var7 > 0) {
                        if(var7 > '\uffff') {
                            throw new RuntimeException("value length should not exceed 65535*2");
                        }

                        byte[] var8 = hexStringToByte((String)var5.getKey());
                        System.arraycopy(var8, 0, var9, var10, var8.length);
                        var10 += var8.length;
                        if(var7 <= 127 && var7 > 0) {
                            var9[var10] = (byte)var7;
                            ++var10;
                        }

                        if(var7 > 127 && var7 <= 255) {
                            var9[var10] = -127;
                            ++var10;
                            var9[var10] = (byte)var7;
                            ++var10;
                        }

                        if(var7 > 255 && var7 <= '\uffff') {
                            var9[var10] = -126;
                            ++var10;
                            var9[var10] = (byte)(var7 >> 8 & 255);
                            ++var10;
                            var9[var10] = (byte)(var7 & 255);
                            ++var10;
                        }

                        System.arraycopy(var6, 0, var9, var10, var7);
                        var10 += var7;
                    }
                }
            }

            return var9;
        }
    }

    public static Map<String, String> tlvToMap(byte[] tlv) {
        if(tlv == null) {
            return new HashMap();
        } else {
            HashMap hashMap = new HashMap();
            int i = 0;

            while(i < tlv.length) {
                byte[] var3;
                if((tlv[i] & 31) == 31) {
                    var3 = new byte[2];
                    System.arraycopy(tlv, i, var3, 0, 2);
                    i += 2;
                    i = copyData(tlv, hashMap, i, var3);
                } else {
                    var3 = new byte[1];
                    System.arraycopy(tlv, i, var3, 0, 1);
                    ++i;
                    i = copyData(tlv, hashMap, i, var3);
                }
            }

            return hashMap;
        }
    }

    private static int copyData(byte[] var0, Map<String, String> var1, int var2, byte[] var3) {
        int var4 = 0;
        if(var0[var2] >> 7 == 0) {
            var4 = var0[var2];
            ++var2;
        } else {
            int var5 = var0[var2] & 127;
            ++var2;
            if(var5 > 2) {
                throw new RuntimeException("Tlv L field byte length not greater than 3");
            }

            for(int var6 = 0; var6 < var5; ++var6) {
                var4 <<= 8;
                var4 += var0[var2] & 255;
                ++var2;
            }
        }

        byte[] var7 = new byte[var4];
        System.arraycopy(var0, var2, var7, 0, var4);
        var2 += var4;
        var1.put(bcd2str(var3), bcd2str(var7));
        return var2;
    }

    public static String bcd2str(byte[] var0) {
        if(var0 == null) {
            return "";
        } else {
            char[] var1 = "0123456789abcdef".toCharArray();
            byte[] var2 = new byte[var0.length * 2];

            for(int var3 = 0; var3 < var0.length; ++var3) {
                var2[var3 * 2] = (byte)(var0[var3] >> 4 & 15);
                var2[var3 * 2 + 1] = (byte)(var0[var3] & 15);
            }

            StringBuffer var5 = new StringBuffer();

            for(int var4 = 0; var4 < var2.length; ++var4) {
                var5.append(var1[var2[var4]]);
            }

            return var5.toString().toUpperCase();
        }
    }

    public static byte[] hexStringToByte(String var0) {
        var0 = var0.toUpperCase();
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
        return (byte)"0123456789ABCDEF".indexOf(var0);
    }

    public static void main(String[] var0) {
        HashMap var1 = new HashMap();
        var1.put("5F11", (Object)null);
        var1.put("5F12", "00120100");
        var1.put("5F13", (Object)null);
        Object var2 = null;
        byte[] var6 = mapToTlv(var1);
        System.out.println(bcd2str(var6));
        Map var3 = null;
        var3 = tlvToMap(var6);
        Iterator var4 = var3.keySet().iterator();

        while(var4.hasNext()) {
            String var5 = (String)var4.next();
            System.out.print("key = " + var5);
            System.out.println(" ||  value = " + (String)var3.get(var5));
        }

    }

    public static class TlvExcetion extends Exception {
        private static final long serialVersionUID = 5876132721837945560L;
        private int errCode;

        public TlvExcetion(String var1) {
            this(0, var1);
        }

        public TlvExcetion(int var1, String var2) {
            super(var2);
            this.errCode = var1;
        }

        public int getErrCode() {
            return this.errCode;
        }
    }
}
