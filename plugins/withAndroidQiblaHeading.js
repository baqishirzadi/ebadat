/**
 * Patches expo-location Android LocationModule to remap the rotation matrix
 * to the current display rotation before getOrientation — closer to iOS Core Location.
 */
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = 'EbadatQiblaHeadingRemap';

function patchLocationModule(contents) {
  if (contents.includes(MARKER)) return contents;

  let next = contents;

  if (!next.includes('import android.view.Surface')) {
    next = next.replace(
      'import android.hardware.SensorManager',
      'import android.hardware.SensorManager\nimport android.view.Surface\nimport android.view.WindowManager'
    );
  }

  const oldBlock = `  private fun sendUpdate() {
    val rotationMatrix = FloatArray(9)
    val inclinationMatrix = FloatArray(9)
    val success = SensorManager.getRotationMatrix(rotationMatrix, inclinationMatrix, mGravity, mGeomagnetic)
    if (success) {
      val orientation = FloatArray(3)
      SensorManager.getOrientation(rotationMatrix, orientation)`;

  const newBlock = `  private fun sendUpdate() {
    // ${MARKER}: remap to display rotation so upright heading matches iOS more closely
    val rotationMatrix = FloatArray(9)
    val inclinationMatrix = FloatArray(9)
    val success = SensorManager.getRotationMatrix(rotationMatrix, inclinationMatrix, mGravity, mGeomagnetic)
    if (success) {
      val remapped = FloatArray(9)
      val rotation = try {
        @Suppress("DEPRECATION")
        (mContext.getSystemService(Context.WINDOW_SERVICE) as WindowManager).defaultDisplay.rotation
      } catch (_: Exception) {
        Surface.ROTATION_0
      }
      val (axisX, axisY) = when (rotation) {
        Surface.ROTATION_90 -> SensorManager.AXIS_Y to SensorManager.AXIS_MINUS_X
        Surface.ROTATION_180 -> SensorManager.AXIS_MINUS_X to SensorManager.AXIS_MINUS_Y
        Surface.ROTATION_270 -> SensorManager.AXIS_MINUS_Y to SensorManager.AXIS_X
        else -> SensorManager.AXIS_X to SensorManager.AXIS_Y
      }
      val remappedOk = SensorManager.remapCoordinateSystem(rotationMatrix, axisX, axisY, remapped)
      val orientation = FloatArray(3)
      SensorManager.getOrientation(if (remappedOk) remapped else rotationMatrix, orientation)`;

  if (!next.includes(oldBlock)) {
    console.warn('[withAndroidQiblaHeading] sendUpdate block not found — skip remap patch');
    return contents;
  }

  return next.replace(oldBlock, newBlock);
}

function withAndroidQiblaHeading(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const modulePath = path.join(
        config.modRequest.projectRoot,
        'node_modules',
        'expo-location',
        'android',
        'src',
        'main',
        'java',
        'expo',
        'modules',
        'location',
        'LocationModule.kt'
      );
      if (!fs.existsSync(modulePath)) {
        console.warn('[withAndroidQiblaHeading] LocationModule.kt not found');
        return config;
      }
      const original = fs.readFileSync(modulePath, 'utf8');
      const patched = patchLocationModule(original);
      if (patched !== original) {
        fs.writeFileSync(modulePath, patched);
      }
      return config;
    },
  ]);
}

module.exports = withAndroidQiblaHeading;
