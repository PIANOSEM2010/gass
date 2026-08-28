package id.bulungan.bug;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        // Plugin panggilan darurat didaftarkan sebelum jembatan Capacitor
        // dijalankan, supaya sisi web sudah bisa memanggilnya sejak awal.
        registerPlugin(PanggilanDarurat.class);
        super.onCreate(savedInstanceState);
    }
}
