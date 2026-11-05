package expo.modules.katacilsystem

import android.content.ComponentName
import android.content.pm.PackageManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Включение и выключение компонентов приложения (виджета на главный экран).
 * Выключенный виджет пропадает из списка виджетов и с главного экрана.
 */
class KatacilSystemModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("KatacilSystem")

    Function("isComponentEnabled") { className: String ->
      val ctx = appContext.reactContext ?: return@Function true
      val cn = ComponentName(ctx.packageName, ctx.packageName + className)
      val state = ctx.packageManager.getComponentEnabledSetting(cn)
      state != PackageManager.COMPONENT_ENABLED_STATE_DISABLED
    }

    Function("setComponentEnabled") { className: String, enabled: Boolean ->
      val ctx = appContext.reactContext ?: return@Function false
      val cn = ComponentName(ctx.packageName, ctx.packageName + className)
      ctx.packageManager.setComponentEnabledSetting(
        cn,
        if (enabled) PackageManager.COMPONENT_ENABLED_STATE_ENABLED else PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
        PackageManager.DONT_KILL_APP
      )
      true
    }
  }
}
