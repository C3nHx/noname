package com.libnoname.noname

import android.content.Intent
import android.webkit.JsResult
import android.webkit.WebChromeClient
import android.webkit.WebView
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.json.JSONObject
import org.json.JSONTokener
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.security.MessageDigest
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

@RunWith(AndroidJUnit4::class)
class ResourcePacksInstrumentedTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private lateinit var webView: WebView

    @Test
    fun downloadAndPlayWithoutArt() = withGame {
        runAsync("window.__qa = await import('https://localhost/noname.js');")
        waitFor("!!__qa.lib.db")
        runAsync("""
            await __qa.game.promises.saveConfig('mode', 'identity');
            await __qa.game.promises.saveConfig('show_splash', 'off');
            await __qa.game.promises.saveConfig('new_tutorial', true);
            await __qa.game.promises.saveConfig('version', __qa.lib.version);
            await __qa.game.promises.saveConfig('game_speed', 'vvfast');
        """)
        evaluate("location.reload();")
        waitFor("!!document.querySelector('#resource-packs-button')")
        runAsync("window.__qa = await import('https://localhost/noname.js');")
        waitFor("__qa.game.players.length === 8")
        assertEquals("true", evaluate("__qa.lib.resourcePacks.textMode"))
        evaluate("__qa.ui.auto.click();")
        waitFor("__qa.game.phaseNumber >= 3")
        File(instrumentation.targetContext.getExternalFilesDir(null), "resource-text-qa.png").outputStream().use {
            instrumentation.uiAutomation.takeScreenshot().compress(android.graphics.Bitmap.CompressFormat.PNG, 100, it)
        }
        val source = InstrumentationRegistry.getArguments().getString("resourceURL")
            ?: throw AssertionError("resourceURL is required")
        runAsync("""
            __qa.lib.resourcePacks.state.source = ${JSONObject.quote(source)};
            __qa.lib.resourcePacks.state.artwork = true;
            await __qa.lib.resourcePacks.download('cards');
            window.__qaFile = __qa.lib.resourcePacks.manifest.packs.find(p => p.id === 'cards').files.find(f => f.path.endsWith('.png'));
            const response = await fetch('/' + __qaFile.path);
            if (!response.ok || (await response.arrayBuffer()).byteLength !== __qaFile.bytes) throw new Error('Native resource route did not return the downloaded image');
        """)
        val record = JSONObject(JSONTokener(evaluate("JSON.stringify(__qaFile)")).nextValue() as String)
        val file = File(instrumentation.targetContext.filesDir, "game/${record.getString("path")}")
        assertTrue("Resource must be stored in the native private overlay", file.isFile)
        assertEquals(record.getLong("bytes"), file.length())
        assertEquals(record.getString("sha256"), sha256(file.readBytes()))
        File(instrumentation.targetContext.filesDir, "resource-test-record.json").writeText(record.toString())
    }

    @Test
    fun reuseAfterProcessRestart() = withGame {
        runAsync("window.__qa = await import('https://localhost/noname.js');")
        assertEquals("false", evaluate("__qa.lib.resourcePacks.textMode"))
        runAsync("await __qa.lib.resourcePacks.download('cards');")
        val record = JSONObject(File(instrumentation.targetContext.filesDir, "resource-test-record.json").readText())
        val file = File(instrumentation.targetContext.filesDir, "game/${record.getString("path")}")
        assertEquals(record.getString("sha256"), sha256(file.readBytes()))
    }

    @Test
    fun missingArtworkFallsBack() {
        val record = JSONObject(File(instrumentation.targetContext.filesDir, "resource-test-record.json").readText())
        val file = File(instrumentation.targetContext.filesDir, "game/${record.getString("path")}")
        assertTrue("The downloaded test image must exist before removal", file.delete())
        withGame {
            runAsync("window.__qa = await import('https://localhost/noname.js');")
            assertEquals("true", evaluate("__qa.lib.resourcePacks.textMode"))
        }
    }

    private fun withGame(block: () -> Unit) {
        val activity = instrumentation.startActivitySync(
            Intent(instrumentation.targetContext, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        ) as MainActivity
        instrumentation.runOnMainSync {
            webView = activity.bridge.webView
            webView.webChromeClient = object : WebChromeClient() {
                override fun onJsConfirm(view: WebView, url: String, message: String, result: JsResult): Boolean {
                    result.confirm()
                    return true
                }
                override fun onJsAlert(view: WebView, url: String, message: String, result: JsResult): Boolean {
                    result.confirm()
                    return true
                }
                override fun onProgressChanged(view: WebView, progress: Int) {
                    if (view.url?.startsWith("https://localhost/") == true) {
                        view.evaluateJavascript("localStorage.setItem('gplv3_noname_alerted', 'true'); localStorage.setItem('noname_0.9_loadtime', '60000');", null)
                    }
                }
            }
        }
        try {
            waitFor("!!document.querySelector('#resource-packs-button')")
            block()
        } finally {
            instrumentation.runOnMainSync { activity.finish() }
        }
    }

    private fun evaluate(script: String): String {
        val latch = CountDownLatch(1)
        var result = "null"
        instrumentation.runOnMainSync { webView.evaluateJavascript(script) { value -> result = value; latch.countDown() } }
        assertTrue("JavaScript callback timed out", latch.await(15, TimeUnit.SECONDS))
        return result
    }

    private fun waitFor(predicate: String) {
        val deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(120)
        while (System.nanoTime() < deadline) {
            if (evaluate("(() => { try { return Boolean($predicate); } catch { return false; } })()") == "true") return
            Thread.sleep(100)
        }
        throw AssertionError("Browser condition timed out: $predicate")
    }

    private fun runAsync(script: String) {
        evaluate("window.__qaResult = 'pending'; (async () => { try { $script; window.__qaResult = 'done'; } catch (e) { window.__qaResult = 'error:' + e.stack; } })();")
        waitFor("window.__qaResult !== 'pending'")
        assertEquals("\"done\"", evaluate("window.__qaResult"))
    }

    private fun sha256(bytes: ByteArray): String = MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
}
