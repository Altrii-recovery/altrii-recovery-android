package com.altrii.recovery

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.altrii.recovery.core.store.Prefs

class MainActivity : AppCompatActivity() {

  data class Step(
    val id: String,
    val title: String,
    val description: String,
    val isComplete: (Context) -> Boolean,
    val ctaLabel: String,
    val cta: (Context) -> Unit
  )

  private lateinit var stepsContainer: LinearLayout
  private lateinit var refreshBtn: Button

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(R.layout.activity_setup)
    stepsContainer = findViewById(R.id.stepsContainer)
    refreshBtn = findViewById(R.id.refreshBtn)
    refreshBtn.setOnClickListener { renderSteps() }
  }

  override fun onResume() {
    super.onResume()
    renderSteps()
  }

  private fun renderSteps() {
    val ctx = this
    stepsContainer.removeAllViews()

    val base = getString(R.string.altrii_base_url).trimEnd('/')

    val steps = listOf(
      Step(
        id = "link",
        title = "Link this device to your Altrii account",
        description = "Open the dashboard and add/register this device. It will appear under My Devices.",
        isComplete = { Prefs.getDeviceId(it) != null },
        ctaLabel = "Open dashboard",
        cta = {
          val url = Uri.parse("$base/devices")
          startActivity(Intent(Intent.ACTION_VIEW, url))
        }
      ),
      Step(
        id = "accessibility",
        title = "Enable the Altrii Accessibility service",
        description = "Required to enforce app/site restrictions reliably.",
        isComplete = { isAccessibilityEnabled(it, packageName) },
        ctaLabel = "Open Accessibility settings",
        cta = {
          startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        }
      ),
      Step(
        id = "owner",
        title = "Set Altrii as Device Owner (recommended)",
        description = "Device Owner prevents removal and factory reset during a lock. This usually requires QR provisioning during device setup.",
        isComplete = { isDeviceOwner(it) },
        ctaLabel = "View instructions",
        cta = {
          val url = Uri.parse("$base/help/device-owner-setup")
          startActivity(Intent(Intent.ACTION_VIEW, url))
        }
      ),
      Step(
        id = "lock",
        title = "Apply a lock from the dashboard",
        description = "Choose how long to lock your settings. The app will sync and show Locked.",
        isComplete = { Prefs.getLockUntil(it) > System.currentTimeMillis() },
        ctaLabel = "Open My Devices",
        cta = {
          val url = Uri.parse("$base/devices")
          startActivity(Intent(Intent.ACTION_VIEW, url))
        }
      )
    )

    // Only show each step once the previous ones are complete
    var gatingOk = true
    steps.forEach { step ->
      val row = layoutInflater.inflate(R.layout._setup_step_row, stepsContainer, false)
      val title = row.findViewById<TextView>(R.id.stepTitle)
      val desc = row.findViewById<TextView>(R.id.stepDesc)
      val status = row.findViewById<TextView>(R.id.stepStatus)
      val btn = row.findViewById<Button>(R.id.stepBtn)

      val complete = step.isComplete(ctx)
      title.text = step.title
      desc.text = step.description

      if (complete) {
        status.text = "✓ Done"
        status.setTextColor(0xFF2E7D32.toInt()) // green
        btn.visibility = View.GONE
      } else {
        status.text = "• To do"
        status.setTextColor(0xFFB71C1C.toInt()) // red
        btn.text = step.ctaLabel
        btn.setOnClickListener { step.cta(ctx) }
        btn.isEnabled = gatingOk
      }

      // Gate subsequent steps until this one is complete
      if (!complete) gatingOk = false

      stepsContainer.addView(row)
    }
  }

  private fun isAccessibilityEnabled(ctx: Context, pkg: String): Boolean {
    return try {
      val enabled = Settings.Secure.getString(ctx.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES)
      enabled?.split(':')?.any { it.contains(pkg, ignoreCase = true) } == true
    } catch (_: Throwable) { false }
  }

  private fun isDeviceOwner(ctx: Context): Boolean {
    return try {
      val dpm = ctx.getSystemService(DEVICE_POLICY_SERVICE) as DevicePolicyManager
      dpm.isDeviceOwnerApp(ctx.packageName)
    } catch (_: Throwable) { false }
  }
}
