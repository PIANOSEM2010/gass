package id.bulungan.bug;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.PermissionState;

/**
 * Panggilan darurat langsung.
 *
 * Halaman web tidak diizinkan memulai panggilan; tautan tel: hanya membuka
 * aplikasi telepon dengan nomor terisi, dan pengguna masih harus menekan
 * tombol panggil. Di dalam APK, Android mengizinkannya lewat izin CALL_PHONE
 * dan Intent ACTION_CALL, sehingga panggilan ke 110 benar-benar berangkat
 * sendiri tanpa ketukan tambahan.
 *
 * Bila izinnya belum diberikan atau ditolak, plugin ini mengembalikan
 * keterangan agar sisi web bisa jatuh kembali ke cara lama (ACTION_DIAL),
 * bukan gagal tanpa penjelasan.
 */
@CapacitorPlugin(
    name = "PanggilanDarurat",
    permissions = {
        @Permission(alias = "telepon", strings = { Manifest.permission.CALL_PHONE })
    }
)
public class PanggilanDarurat extends Plugin {

    /** Memeriksa apakah panggilan langsung sudah diizinkan. */
    @PluginMethod
    public void status(PluginCall call) {
        JSObject hasil = new JSObject();
        hasil.put("didukung", true);
        hasil.put("diizinkan", punyaIzin());
        call.resolve(hasil);
    }

    /** Meminta izin panggilan langsung kepada pengguna. */
    @PluginMethod
    public void mintaIzin(PluginCall call) {
        if (punyaIzin()) {
            JSObject hasil = new JSObject();
            hasil.put("diizinkan", true);
            call.resolve(hasil);
            return;
        }
        requestPermissionForAlias("telepon", call, "hasilIzin");
    }

    @com.getcapacitor.annotation.PermissionCallback
    private void hasilIzin(PluginCall call) {
        JSObject hasil = new JSObject();
        hasil.put("diizinkan", getPermissionState("telepon") == PermissionState.GRANTED);
        call.resolve(hasil);
    }

    /**
     * Menelepon nomor darurat. Bila izin ada, panggilan langsung berangkat.
     * Bila tidak, aplikasi telepon dibuka dengan nomor terisi sebagai cadangan.
     */
    @PluginMethod
    public void telepon(PluginCall call) {
        String nomor = call.getString("nomor", "110");
        if (nomor == null || nomor.trim().isEmpty()) {
            call.reject("Nomor tidak boleh kosong");
            return;
        }

        boolean langsung = punyaIzin();
        Intent maksud = new Intent(langsung ? Intent.ACTION_CALL : Intent.ACTION_DIAL);
        maksud.setData(Uri.parse("tel:" + nomor.trim()));
        maksud.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        try {
            getContext().startActivity(maksud);
            JSObject hasil = new JSObject();
            hasil.put("langsung", langsung);
            call.resolve(hasil);
        } catch (SecurityException e) {
            // Ada peranti yang menolak walau izin tercatat diberikan.
            // Jangan biarkan gagal senyap: buka aplikasi telepon sebagai cadangan.
            try {
                Intent cadangan = new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + nomor.trim()));
                cadangan.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(cadangan);
                JSObject hasil = new JSObject();
                hasil.put("langsung", false);
                call.resolve(hasil);
            } catch (Exception lagi) {
                call.reject("Gagal membuka penelepon: " + lagi.getMessage());
            }
        } catch (Exception e) {
            call.reject("Gagal membuka penelepon: " + e.getMessage());
        }
    }

    private boolean punyaIzin() {
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.CALL_PHONE)
            == PackageManager.PERMISSION_GRANTED;
    }
}
