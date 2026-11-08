package com.libnoname.noname

import android.content.Intent
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

@RunWith(AndroidJUnit4::class)
class LobbyConnectionInstrumentedTest {
    @Test
    fun releaseClientConnectsToPlainWebSocketLobby() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val address = InstrumentationRegistry.getArguments().getString("lobbyAddress")
            ?: "ws://10.0.2.2:18082"
        val activity = instrumentation.startActivitySync(
            Intent(instrumentation.targetContext, MainActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        ) as MainActivity
        try {
            val deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(30)
            while (evaluate(activity, "location.origin === 'https://localhost' && document.readyState === 'complete'") != "true") {
                check(System.nanoTime() < deadline) { "Packaged page did not load" }
                Thread.sleep(100)
            }
            evaluate(activity, """
                window.__lobbyProbe = { done: false, alerts: [] };
                window.alert = message => window.__lobbyProbe.alerts.push(message);
                window.confirm = () => true;
                try {
                    const socket = new WebSocket(${JSONObject.quote(address)});
                    socket.onopen = () => {
                        window.__lobbyProbe.success = true;
                        window.__lobbyProbe.done = true;
                        socket.close();
                    };
                    socket.onerror = () => {
                        window.__lobbyProbe.error = 'WebSocket connection failed';
                        window.__lobbyProbe.done = true;
                    };
                } catch (error) {
                    window.__lobbyProbe.error = String(error);
                    window.__lobbyProbe.done = true;
                }
            """.trimIndent())
            while (evaluate(activity, "window.__lobbyProbe.done") != "true") {
                check(System.nanoTime() < deadline) { "Lobby connection did not finish" }
                Thread.sleep(100)
            }
            val result = evaluate(activity, "window.__lobbyProbe")
            assertEquals("Release WebView lobby connection: $result", true, JSONObject(result).optBoolean("success"))
        } finally {
            instrumentation.runOnMainSync { activity.finish() }
        }
    }

    private fun evaluate(activity: MainActivity, script: String): String {
        val latch = CountDownLatch(1)
        var result = "null"
        InstrumentationRegistry.getInstrumentation().runOnMainSync {
            activity.bridge.webView.evaluateJavascript(script) {
                result = it
                latch.countDown()
            }
        }
        check(latch.await(10, TimeUnit.SECONDS)) { "WebView evaluation timed out" }
        return result
    }
}
