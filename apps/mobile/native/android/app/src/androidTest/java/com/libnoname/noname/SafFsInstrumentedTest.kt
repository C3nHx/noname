package com.libnoname.noname

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.util.Base64
import androidx.activity.result.ActivityResult
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.getcapacitor.JSObject
import com.getcapacitor.PluginCall
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.util.UUID

@RunWith(AndroidJUnit4::class)
class SafFsInstrumentedTest {
    @Test
    fun bundledResourcesAndPrivateFilesWorkWithoutDirectoryPermission() = withPlugin { plugin ->
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val store = SafOverlayStore(context)
        assertFalse("Run on a fresh test installation without SAF grants", store.hasPersistedAccess())
        assertEquals("file", store.root().uri.scheme)

        val stat = call("entryName" to "noname.js")
        plugin.statEntry(stat)
        assertEquals("file", stat.result().getString("type"))
        val bundled = call("fileName" to "noname.js")
        plugin.readFileAsText(bundled)
        assertTrue(bundled.result().getString("data")!!.contains("export"))

        val folder = "android-regression-${UUID.randomUUID()}"
        val path = "$folder/中文资源.js"
        val text = "export default '安卓资源读取成功';"
        val create = call("dir" to folder)
        plugin.createDir(create)
        create.result()
        try {
            val write = call("path" to path, "data" to Base64.encodeToString(text.toByteArray(), Base64.NO_WRAP))
            plugin.writeFile(write)
            write.result()

            val read = call("fileName" to path)
            plugin.readFileAsText(read)
            assertEquals(text, read.result().getString("data"))
            val binary = call("fileName" to path)
            plugin.readFile(binary)
            assertArrayEquals(text.toByteArray(), Base64.decode(binary.result().getString("data"), Base64.DEFAULT))

            val listing = call("dir" to folder)
            plugin.getFileList(listing)
            assertEquals("中文资源.js", listing.result().getJSONArray("files").getString(0))
            assertEquals(text, JsAwarePathHandler(context, "public").handle(path)!!.data.bufferedReader().use { it.readText() })
            assertTrue(JsAwarePathHandler(context, "public").handle("noname.js")!!.data.bufferedReader().use { it.readText() }.contains("export"))

            val bytes = byteArrayOf(0, 1, 127, -128, -1)
            val overwrite = call("path" to path, "data" to Base64.encodeToString(bytes, Base64.NO_WRAP))
            plugin.writeFile(overwrite)
            overwrite.result()
            val rewritten = call("fileName" to path)
            plugin.readFile(rewritten)
            assertArrayEquals(bytes, Base64.decode(rewritten.result().getString("data"), Base64.DEFAULT))

            val remove = call("fileName" to path)
            plugin.removeFile(remove)
            remove.result()
            val missing = call("entryName" to path)
            plugin.statEntry(missing)
            assertEquals("none", missing.result().getString("type"))
        } finally {
            val remove = call("dir" to folder)
            plugin.removeDir(remove)
            remove.result()
        }

        val traversal = call("path" to "../outside.txt", "data" to "")
        plugin.writeFile(traversal)
        assertNotNull(traversal.failure)
    }

    @Test
    fun staleDirectoryGrantFallsBackToPrivateStorage() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val store = SafOverlayStore(context)
        assertNull("Run on a fresh test installation without a saved SAF directory", store.rootUri)
        try {
            store.saveRootUri(Uri.parse("content://com.android.externalstorage.documents/tree/primary%3Anoname-test"))
            assertFalse(store.hasPersistedAccess())
            assertEquals("file", store.root().uri.scheme)
            assertNotNull(store.openAsset("noname.js"))
        } finally {
            context.getSharedPreferences("SafFs", 0).edit().remove("rootUri").commit()
        }
    }

    @Test
    fun cancellingDirectorySelectionKeepsBundledResourcesAvailable() = withPlugin { plugin ->
        val cancel = call()
        plugin.handleOpenDocumentTree(cancel, ActivityResult(Activity.RESULT_CANCELED, null))
        assertFalse(cancel.result().getBoolean("granted"))

        val empty = call()
        plugin.handleOpenDocumentTree(empty, ActivityResult(Activity.RESULT_OK, Intent()))
        assertFalse(empty.result().getBoolean("granted"))

        val stat = call("entryName" to "noname.js")
        plugin.statEntry(stat)
        assertEquals("file", stat.result().getString("type"))
    }

    private fun withPlugin(block: (SafFsPlugin) -> Unit) {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val intent = Intent(instrumentation.targetContext, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        val activity = instrumentation.startActivitySync(intent) as MainActivity
        try {
            block(activity.bridge.getPlugin("SafFs").instance as SafFsPlugin)
        } finally {
            instrumentation.runOnMainSync { activity.finish() }
        }
    }

    private fun call(vararg values: Pair<String, String>) = ResultCall(
        JSObject().apply { values.forEach { (key, value) -> put(key, value) } }
    )

    private class ResultCall(options: JSObject) : PluginCall(null, "SafFs", "test", "test", options) {
        private var response: JSObject? = null
        var failure: String? = null
            private set

        override fun resolve(data: JSObject) {
            response = data
        }

        override fun reject(message: String?, code: String?, exception: Exception?, data: JSObject?) {
            failure = message ?: "Plugin call failed"
        }

        fun result(): JSObject {
            assertNull(failure)
            return requireNotNull(response) { "Plugin call did not return a result" }
        }
    }
}
