(function () {
  function parseDecimal(value) {
    if (!value) return null;
    var n = Number(String(value).replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : null;
  }

  function formatValue(value) {
    return String(Math.round((value + Number.EPSILON) * 100) / 100);
  }

  function recalcForForm(prefix) {
    var tuition = document.getElementById(prefix + "-estimated_total_tuition");
    var living = document.getElementById(prefix + "-estimated_total_living_cost");
    var total = document.getElementById(prefix + "-estimated_total_cost");

    if (!tuition || !living || !total) return;

    var tuitionValue = parseDecimal(tuition.value);
    var livingValue = parseDecimal(living.value);

    if (tuitionValue === null || livingValue === null) return;

    total.value = formatValue(tuitionValue + livingValue);
  }

  function detectPrefixes() {
    var prefixes = new Set();
    var fields = document.querySelectorAll("input[id$='-estimated_total_tuition']");
    fields.forEach(function (field) {
      prefixes.add(field.id.replace(/-estimated_total_tuition$/, ""));
    });
    return Array.from(prefixes);
  }

  function attachListeners() {
    var prefixes = detectPrefixes();

    prefixes.forEach(function (prefix) {
      ["-estimated_total_tuition", "-estimated_total_living_cost"].forEach(function (suffix) {
        var el = document.getElementById(prefix + suffix);
        if (!el) return;
        el.addEventListener("input", function () {
          recalcForForm(prefix);
        });
        el.addEventListener("change", function () {
          recalcForForm(prefix);
        });
      });

      recalcForForm(prefix);
    });
  }

  document.addEventListener("DOMContentLoaded", attachListeners);
})();
