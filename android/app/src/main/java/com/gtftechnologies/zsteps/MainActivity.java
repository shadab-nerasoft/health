package com.gtftechnologies.zsteps;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.gtftechnologies.zsteps.stepcounter.StepCounterPlugin;
import com.gtftechnologies.zsteps.theme.DynamicColorPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugins that live in the app module are not auto-discovered the way
        // npm plugins are, so register before the bridge starts.
        registerPlugin(StepCounterPlugin.class);
        registerPlugin(DynamicColorPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
