frappe.pages["stock-trans"].on_page_load = async function(wrapper) {
  // Hide default Frappe navbar for this page and restore on leave
  (function hideNavbarForStockTrans() {
    const hide = () => {
      const $nb = $('.navbar, .navbar-default, .page-head, header.navbar');
      $nb.attr('data-stock-trans-hidden', '1').css('display', 'none');
      $('.page-head, .page-head-content, .page-head .container').css('display', 'none');
    };
    const show = () => {
      const $nb = $('.navbar, .navbar-default, .page-head, header.navbar');
      $nb.filter('[data-stock-trans-hidden="1"]').css('display', '');
      $('.page-head, .page-head-content, .page-head .container').css('display', '');
      $nb.removeAttr('data-stock-trans-hidden');
    };

    try {
      if (frappe && frappe.get_route && frappe.get_route()[0] === 'stock-trans') hide();
    } catch(e) {}

    const page = frappe.pages['stock-trans'];
    if (page) {
      const orig_show = page.show;
      page.show = function() {
        hide();
        if (typeof orig_show === 'function') return orig_show.apply(this, arguments);
      };
    }

    $(window).on('hashchange.stock_trans_navbar', function() {
      try {
        const r = frappe.get_route ? frappe.get_route() : [];
        if (r[0] === 'stock-trans') hide(); else show();
      } catch(e) {}
    });

    window.addEventListener('beforeunload', show);
    $(document).on('page-change.stock_trans_navbar', function() {
      try {
        const r = frappe.get_route ? frappe.get_route() : [];
        if (r[0] === 'stock-trans') hide(); else show();
      } catch(e) {}
    });
  })();

  const TEXT = {
    TITLE: "نقل المخزون",
    REFRESH: "تحديث",
    DIRECTION_IN: "تحميل السيارة",
    DIRECTION_OUT: "تفريغ السيارة",
    SOURCE_WH: " المخزن الرئيسي",
    TARGET_WH: " المخزن الرئيسي",
    SELECT_WAREHOUSE: "اختر المخزن",
    BROWSE_ITEMS: "تصفح الأصناف",
    SEARCH_ITEMS: "ابحث عن صنف",
    NO_ITEMS: "لا توجد أصناف مضافة",
    ADD_ITEMS_HINT: "اختر المخزن ثم أضف الأصناف المراد نقلها.",
    HINT_IN: "سيتم التحويل من المخزن المحدد إلى مستودع نقاط البيع.",
    HINT_OUT: "سيتم التحويل من مستودع نقاط البيع إلى المخزن المحدد.",
    QTY: "الكمية",
    UOM: "الوحدة",
    ITEM: "الصنف",
    REMOVE: "حذف",
    TOTAL_ROWS: "إجمالي الأصناف",
    SUBMIT: "تنفيذ التحويل",
    LOADING: "جاري التحميل...",
    WAREHOUSE_REQUIRED: "يرجى اختيار المخزن.",
    ITEMS_REQUIRED: "أضف صنفًا واحدًا على الأقل.",
    SOURCE_STOCK_ONLY: "لا يمكن إضافة أصناف من دون توفر في المخزن المصدر.",
    TRANSFER_SUCCESS: "تم إنشاء مسودة تحويل المخزون بنجاح.",
    DRAFT_HINT: "(مسودة - تحتاج إلى اعتماد)",
    DIRECTION_LABEL: "نوع التحويل",
    AVAILABLE: qty => `المتوفر: ${qty}`,
    ADD: "إضافة",
    CANCEL: "اغلاق",
    NO_STOCK_ITEMS: "لا توجد أصناف متاحة في المخزن المحدد.",
    QTY_LIMIT: "الكمية تتجاوز المتاح في المخزن.",
    INVALID_QTY: "أدخل كمية صحيحة أكبر من صفر.",
    DETAIL_LOADING: "جاري تحميل بيانات الصنف...",
    ITEM_ADDED: "تمت إضافة الصنف إلى القائمة.",
    ADD_ALL: "إضافة كل المتاح"
  };

  const toFloat = val => {
    let num = parseFloat(val);
    return Number.isFinite(num) ? num : 0;
  };

  // Convert Arabic numerals (٠-٩) to English numerals (0-9) and handle Arabic decimal/thousands separators
  const convertArabicToEnglishNumbers = (str) => {
    if (!str) return str;
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    const englishNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    let result = String(str);

    // Convert Arabic numerals to English
    for (let i = 0; i < 10; i++) {
      result = result.replace(new RegExp(arabicNumerals[i], 'g'), englishNumerals[i]);
    }

    // Convert Arabic/Persian decimal separator (٫) to English (.)
    result = result.replace(/٫/g, '.');

    // Convert Arabic/Persian thousands separator (٬) to English (,)
    result = result.replace(/٬/g, ',');

    // Remove all commas (thousands separators) for clean number input
    result = result.replace(/,/g, '');

    return result;
  };

  // Print stock transfer receipt to terminal printer
  function printStockTransfer(data) {
    // Check if we're running in Android WebView with Sunyard SDK
    if (typeof Android !== 'undefined' && typeof Android.printStockTransfer === 'function') {
      try {
        Android.printStockTransfer(JSON.stringify(data));
        frappe.show_alert({
          message: '<i class="fa fa-print"></i> جاري طباعة إذن التحويل...',
          indicator: 'blue'
        }, 3);
      } catch (e) {
        console.error('Print error:', e);
        frappe.show_alert({
          message: '<i class="fa fa-exclamation-circle"></i> خطأ في الطباعة: ' + e.message,
          indicator: 'orange'
        }, 4);
      }
    } else if (typeof Android !== 'undefined' && typeof Android.printReceipt === 'function') {
      // Fallback: use printReceipt with text_content for older APK versions
      try {
        let textLines = [];
        textLines.push("================================");
        textLines.push("Elnoor-النور");
        textLines.push("================================");
        textLines.push(data.transfer_type === "تحميل" ? "إذن تحميل" : data.transfer_type === "تفريغ" ? "إذن تفريغ" : "إذن تحويل مخزون");
        textLines.push("================================");
        textLines.push("رقم الإذن: " + data.name);
        textLines.push("نوع التحويل: " + data.transfer_type);
        textLines.push("من مخزن: " + data.source_warehouse);
        textLines.push("إلى مخزن: " + data.target_warehouse);
        textLines.push("التاريخ: " + data.date);
        textLines.push("الوقت: " + data.time);
        textLines.push("--------------------------------");
        textLines.push("الأصناف:");
        if (data.items && data.items.length) {
          data.items.forEach((item, idx) => {
            textLines.push((idx + 1) + ". " + item.item_name + " - " + item.qty + " " + item.uom);
          });
        }
        textLines.push("--------------------------------");
        textLines.push("عدد الأصناف: " + data.total_items);
        textLines.push("إجمالي الكمية: " + data.total_qty);
        textLines.push("================================");
        textLines.push("توقيع المستلم: ________________");
        textLines.push(" ");
        textLines.push("توقيع المسلم: ________________");
        textLines.push("--------------------------------");
        textLines.push("تم الطباعة من نظام Mobile POS");

        let printData = {
          text_content: textLines.join("\n")
        };
        Android.printReceipt(JSON.stringify(printData));
        frappe.show_alert({
          message: '<i class="fa fa-print"></i> جاري طباعة إذن التحويل...',
          indicator: 'blue'
        }, 3);
      } catch (e) {
        console.error('Print error:', e);
      }
    } else {
      // Not on Android device - log for debugging
      console.log('Stock transfer print data:', data);
    }
  }

  // Print callbacks for Android bridge
  window.onPrintSuccess = function(msg) {
    frappe.show_alert({
      message: '<i class="fa fa-check-circle"></i> ' + msg,
      indicator: 'green'
    }, 3);
  };

  window.onPrintError = function(msg) {
    frappe.show_alert({
      message: '<i class="fa fa-times-circle"></i> ' + msg,
      indicator: 'red'
    }, 4);
  };

  const css = `<style>
    /* === ULTRA-ADVANCED RESPONSIVE DESIGN WITH GLASS MORPHISM === */

    /* Smooth scrolling for entire page */
    html {
        scroll-behavior: smooth;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
    }

    /* Prevent zoom on double-tap for mobile */
    * {
        touch-action: manipulation;
    }

    .st-main {
      max-width: 680px;
      margin: 32px auto 0;
      /* Glass morphism effect */
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border-radius: 28px;
      box-shadow:
          0 8px 32px rgba(102, 126, 234, 0.2),
          0 16px 64px rgba(118, 75, 162, 0.15),
          inset 0 1px 1px rgba(255, 255, 255, 0.9);
      padding: 24px 18px 32px 18px;
      border: 1px solid rgba(255, 255, 255, 0.4);
      direction: rtl;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }

    .st-main:hover {
        transform: translateY(-2px);
        box-shadow:
            0 12px 32px rgba(102, 126, 234, 0.2),
            0 16px 48px rgba(118, 75, 162, 0.15),
            inset 0 1px 1px rgba(255, 255, 255, 1);
    }

    .st-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
      border-radius: 26px 26px 0 0;
      position: relative;
      overflow: hidden;
      padding: 18px 16px 20px;
      display:flex;
      align-items:center;
      justify-content:space-between;
      flex-wrap:wrap;
      gap:12px;
      box-shadow:
          0 4px 16px rgba(102, 126, 234, 0.3),
          inset 0 -1px 0 rgba(255, 255, 255, 0.2);
    }

    .st-header::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.1) 100%);
        pointer-events: none;
    }
    .st-direction-buttons {
      display:flex;
      flex-wrap:wrap;
      gap:10px;
      min-width: 0;
      flex: 1 1 auto;
      position: relative;
      z-index: 1;
    }
    .st-direction-btn {
      border: 2px solid #fde68a;
      background: linear-gradient(to bottom, #ffffff 0%, #fefce8 100%);
      color:#0f172a;
      border-radius:20px;
      padding: 10px 20px;
      font-weight:700;
      font-size: 1em;
      cursor:pointer;
      transition:all 0.2s ease;
      min-width:140px;
      min-height: 48px;
      text-align:center;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 3px 10px rgba(253, 230, 138, 0.4), 0 1px 3px rgba(0, 0, 0, 0.1);
      position: relative;
      overflow: hidden;
    }

    .st-direction-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(253, 230, 138, 0.5), 0 2px 6px rgba(0, 0, 0, 0.15);
        border-color: #fbbf24;
        background: #fde68a;
    }

    .st-direction-btn:active {
        transform: translateY(1px);
    }

    .st-direction-btn.active {
      background:#f59e42;
      color:#fff;
      border-color:#f59e42;
      box-shadow:0 4px 12px #f59e4266;
      transform: scale(1.02);
    }

    /* Header actions row: Refresh + Home unified sizing */
    .st-header-actions {
      display:flex;
      gap:8px;
      align-items:stretch;
      justify-content:center;
      min-width:0;
      flex: 0 0 auto;
      position: relative;
      z-index: 1;
    }
    .st-header-action-btn {
      flex: 1 1 160px;
      max-width: 240px;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      gap: 10px;
      height: 52px;
      padding: 0 24px;
      border-radius:999px;
      font-size:1.05em;
      font-weight:700;
      white-space:nowrap;
    }

    /* Enhanced button styles with neon glow effects */
    @keyframes stButtonGlow {
      0%, 100% { transform: translate(-25%, -25%) scale(0.8); }
      50% { transform: translate(-25%, -25%) scale(1.2); }
    }

    .st-home-btn {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #ffffff;
      border: none;
      cursor: pointer;
      transition: transform .15s ease, box-shadow .15s ease, background .15s ease;
      box-shadow:
        0 4px 16px rgba(16, 185, 129, 0.4),
        0 0 20px rgba(16, 185, 129, 0.2),
        inset 0 1px 1px rgba(255, 255, 255, 0.3);
      position: relative;
      overflow: hidden;
    }

    .st-home-btn::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%);
      opacity: 0;
      transition: opacity 0.3s;
    }

    .st-home-btn:hover::before {
      animation: stButtonGlow 2s ease-in-out infinite;
      opacity: 1;
    }

    .st-home-btn:hover {
      transform: translateY(-2px);
      box-shadow:
        0 8px 24px rgba(16, 185, 129, 0.5),
        0 0 40px rgba(16, 185, 129, 0.3),
        inset 0 1px 1px rgba(255, 255, 255, 0.4);
    }
    .st-home-btn:active {
      transform: translateY(0);
      box-shadow:
        0 4px 12px rgba(16, 185, 129, 0.4),
        0 0 20px rgba(16, 185, 129, 0.2);
    }

    /* Refresh button styling */
    .st-refresh-btn {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: #ffffff;
      border: none;
      cursor: pointer;
      transition: transform .15s ease, box-shadow .15s ease, background .15s ease;
      box-shadow:
        0 4px 16px rgba(59, 130, 246, 0.4),
        0 0 20px rgba(59, 130, 246, 0.2),
        inset 0 1px 1px rgba(255, 255, 255, 0.3);
      position: relative;
      overflow: hidden;
      min-width: 52px !important;
      max-width: 52px !important;
      flex: 0 0 52px !important;
      padding: 0 !important;
    }

    .st-refresh-btn::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%);
      opacity: 0;
      transition: opacity 0.3s;
    }

    .st-refresh-btn:hover::before {
      animation: stButtonGlow 2s ease-in-out infinite;
      opacity: 1;
    }

    .st-refresh-btn:hover {
      transform: translateY(-2px);
      box-shadow:
        0 8px 24px rgba(59, 130, 246, 0.5),
        0 0 40px rgba(59, 130, 246, 0.3),
        inset 0 1px 1px rgba(255, 255, 255, 0.4);
    }

    .st-refresh-btn:active {
      transform: translateY(0);
      box-shadow:
        0 4px 12px rgba(59, 130, 246, 0.4),
        0 0 20px rgba(59, 130, 246, 0.2);
    }

    .st-refresh-btn:hover i {
      animation: iconBounce 0.6s ease;
    }

    .st-section {
      margin-top: 16px;
      background:#fff;
      border:1.5px solid #dbeafe;
      border-radius:16px;
      padding:12px 14px;
      box-shadow:0 2px 10px #dbeafe33;
    }
    .st-section-label {
      font-weight:700;
      color:#0f172a;
      margin-bottom:8px;
      display:block;
      font-size:1.02em;
    }
    .st-warehouse-picker {
      width:100%;
      border-radius:16px;
      border:1.5px solid #0ea5e9;
      padding:12px 14px;
      font-size:1.08em;
      background:#fff;
      color:#0f172a;
      font-weight:700;
      cursor:pointer;
      transition: all .15s ease;
      position:relative;
      display:flex;
      align-items:center;
      justify-content:space-between;
      min-height:50px;
      box-shadow: 0 2px 8px rgba(14, 165, 233, 0.15);
    }
    .st-warehouse-picker:hover {
      border-color:#0284c7;
      box-shadow: 0 4px 12px rgba(14, 165, 233, 0.25);
      background:#f0f9ff;
    }
    .st-warehouse-picker:active {
      transform: scale(0.98);
    }
    .st-warehouse-display {
      flex:1;
      text-align:right;
    }
    .st-warehouse-icon {
      color:#0ea5e9;
      font-size:1.1em;
      margin-left:8px;
    }
    .st-warehouse-options {
      position:fixed;
      top:0;
      left:0;
      width:100%;
      height:100%;
      background:rgba(15, 23, 42, 0.7);
      z-index:9999;
      display:none;
      align-items:center;
      justify-content:center;
      padding:20px;
    }
    .st-warehouse-options.active {
      display:flex;
    }
    .st-warehouse-menu {
      background:#fff;
      border-radius:20px;
      padding:20px;
      max-width:500px;
      width:100%;
      max-height:70vh;
      overflow:auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    .st-warehouse-menu-title {
      font-size:1.2em;
      font-weight:700;
      color:#0f172a;
      margin-bottom:16px;
      text-align:center;
      padding-bottom:12px;
      border-bottom:2px solid #e0f2fe;
    }
    .st-warehouse-option {
      padding:14px 16px;
      margin:8px 0;
      border-radius:14px;
      border:1.5px solid #dbeafe;
      background:#f8fbff;
      color:#0f172a;
      font-weight:600;
      cursor:pointer;
      transition:all .15s ease;
      text-align:right;
    }
    .st-warehouse-option:hover {
      background:#0ea5e9;
      color:#fff;
      border-color:#0ea5e9;
      transform:translateX(-4px);
    }
    .st-warehouse-option.disabled {
      opacity:0.5;
      cursor:not-allowed;
      background:#f1f5f9;
      color:#94a3b8;
      font-style:italic;
    }
    .st-warehouse-option.disabled:hover {
      background:#f1f5f9;
      color:#94a3b8;
      transform:none;
    }
    .st-warehouse-option.selected {
      background:#0ea5e9;
      color:#fff;
      border-color:#0ea5e9;
    }
    .st-warehouse-close {
      display:block;
      width:100%;
      padding:12px;
      margin-top:16px;
      border-radius:14px;
      background:#ef4444;
      color:#fff;
      font-weight:700;
      border:none;
      cursor:pointer;
    }
    .st-browse-btn {
      width:100%;
      height:44px;
      font-size:1.07em;
      background:linear-gradient(90deg,#10b981 0,#22d3ee 100%);
      color:#fff;
      border:none;
      border-radius:18px;
      font-weight:700;
      box-shadow:0 2px 10px #0ea5e933;
      display:flex;
      align-items:center;
      justify-content:center;
      gap:8px;
      margin-top:8px;
    }
    .st-table-wrap {
      margin-top:16px;
      background:#f7fafc;
      border-radius:14px;
      border:1.5px solid #e0e7ef;
      overflow:hidden;
    }
    .st-table {
      width:100%;
      font-size:0.98em;
      border-collapse:separate;
      border-spacing:0;
    }
    .st-table th, .st-table td {
      padding:10px 8px;
      text-align:right;
      border-bottom:1px solid #e0e7ef;
    }
    .st-table th {
      background:#e0e7ef;
      font-weight:700;
      color:#0f172a;
      position: sticky;
      top: 0;
      z-index: 1;
    }
    .st-empty {
      padding:14px;
      text-align:center;
      color:#94a3b8;
      font-weight:600;
    }
    .st-qty-input {
      width:90px;
      border-radius:14px;
      border:1.5px solid #dbeafe;
      padding:6px 8px;
      text-align:center;
      background:#fff;
    }
    .st-remove-btn {
      border:none;
      border-radius:14px;
      padding:6px 12px;
      background:linear-gradient(90deg,#f87171 0,#fbbf24 100%);
      color:#fff;
      font-weight:700;
      cursor:pointer;
      box-shadow:0 2px 8px #f8717133;
    }
    .st-footer {
      margin-top:18px;
      text-align:center;
    }
    .st-submit-btn {
      width:100%;
      font-size:1.1em;
      padding:12px 0;
      border-radius:18px;
      font-weight:700;
      background:linear-gradient(90deg,#0ea5e9 0,#22d3ee 100%);
      color:#fff;
      border:none;
      box-shadow:0 6px 20px #0ea5e933;
    }
    .st-feedback {
      margin-top:12px;
    }
    .st-msg {
      border-radius:10px;
      padding:10px 12px;
      font-weight:600;
      font-size:0.95em;
    }
    .st-msg-success {
      background:#dcfce7;
      border:1px solid #15803d44;
      color:#15803d;
    }
    .st-msg-error {
      background:#fee2e2;
      border:1px solid #b91c1c44;
      color:#b91c1c;
    }
    .st-item-meta {
      font-size:0.85em;
      color:#64748b;
    }
    .st-catalog-wrap {
      display:flex;
      flex-direction:column;
      gap:14px;
    }
    .st-catalog-search input {
      width:100%;
      border-radius:16px;
      border:1.5px solid #dbeafe;
      background:#f9fafb;
      padding:9px 14px;
      font-size:1em;
      box-shadow:0 1px 6px #bae6fd33;
    }
    .st-catalog-grid {
      display:grid;
      grid-template-columns:repeat(auto-fill,minmax(170px,1fr));
      gap:16px;
      max-height:420px;
      overflow:auto;
      padding:4px;
    }
    .st-catalog-toolbar {
      display:flex;
      flex-wrap:wrap;
      gap:10px;
      justify-content:space-between;
      align-items:center;
    }
    .st-add-all-btn {
      border:none;
      border-radius:18px;
      padding:6px 14px;
      background:linear-gradient(90deg,#22c55e 0,#16a34a 100%);
      color:#fff;
      font-weight:700;
      cursor:pointer;
      box-shadow:0 4px 12px #22c55e55;
    }
    .st-catalog-card {
      border:1.5px solid #bae6fd;
      border-radius:20px;
      padding:14px;
      background:linear-gradient(180deg,#f8fbff 0,#ffffff 100%);
      box-shadow:0 6px 20px #bae6fd40;
      cursor:pointer;
      display:flex;
      flex-direction:column;
      gap:10px;
      transition:transform .16s ease, box-shadow .16s ease;
    }
    .st-catalog-card:hover { transform:translateY(-3px); box-shadow:0 14px 30px #bae6fd60; }
    .st-catalog-card.disabled { opacity:0.45; cursor:not-allowed; pointer-events:none; }
    .st-catalog-title {
      font-weight:700;
      color:#0f172a;
      font-size:1.02em;
    }
    .st-catalog-sub {
      font-size:0.83em;
      color:#94a3b8;
    }
    .st-catalog-qty {
      font-size:0.85em;
      color:#0f766e;
      font-weight:600;
    }
    .st-catalog-actions { display:none; }
    .st-dialog-item-name {
      font-weight:700;
      color:#0f172a;
      font-size:1.08em;
    }
    .st-dialog-item-meta {
      font-size:0.88em;
      color:#64748b;
    }
    .st-dialog-stock {
      margin-top:6px;
      font-size:0.9em;
      color:#0f766e;
      font-weight:600;
    }
    .st-uom-buttons {
      display:flex;
      flex-wrap:wrap;
      gap:8px;
      margin-top:12px;
    }
    .st-uom-btn {
      border:1.5px solid #bae6fd;
      background:#fff;
      color:#0284c7;
      border-radius:18px;
      padding:6px 14px;
      font-weight:600;
      cursor:pointer;
      transition:all .15s ease;
    }
    .st-uom-btn.active {
      background:#0ea5e9;
      color:#fff;
      border-color:#0ea5e9;
      box-shadow:0 4px 10px #0ea5e966;
    }
    .st-uom-btn.disabled { opacity:0.6; cursor:not-allowed; }
    .st-dialog-qty-input {
      width:100%;
      border-radius:16px;
      border:1.5px solid #dbeafe;
      padding:8px 12px;
      margin-top:14px;
      text-align:right;
      background:#f9fafb;
    }

    /* Responsive adjustments */
    @media(max-width:800px){
      .st-main { max-width: 96vw; }
    }
    @media(max-width:600px){
      .st-header { flex-direction:column; align-items:stretch; gap:10px; }
      .st-direction-buttons { width:100%; justify-content:center; gap:8px; }
      .st-direction-btn { flex:1 1 0; min-width:0; padding:8px 10px; }
      .st-header-actions { width:100%; }
      .st-header-action-btn { flex: 1 1 0; max-width:none; height: 44px; font-size:1em; }
    }
    @media(max-width:360px){
      .st-header-action-btn { padding:0 10px; font-size:0.93em; }
    }

    /* === ADVANCED BUTTON ANIMATIONS & MICRO-INTERACTIONS === */

    /* Submit button pulse animation */
    @keyframes submitPulse {
        0%, 100% {
            box-shadow: 0 4px 16px rgba(34, 197, 94, 0.4), 0 0 0 0 rgba(34, 197, 94, 0.4);
        }
        50% {
            box-shadow: 0 6px 24px rgba(34, 197, 94, 0.6), 0 0 0 8px rgba(34, 197, 94, 0);
        }
    }

    button[style*="background:linear-gradient(90deg,#22c55e"]:not(:disabled) {
        animation: submitPulse 2.5s ease-in-out infinite;
    }

    button[style*="background:linear-gradient(90deg,#22c55e"]:hover:not(:disabled) {
        animation: none;
        transform: translateY(-2px) scale(1.02);
        box-shadow: 0 8px 32px rgba(34, 197, 94, 0.6);
    }

    /* Icon bounce on hover for home button */
    .st-home-btn:hover i {
        animation: iconBounce 0.6s ease;
    }

    @keyframes iconBounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
    }

    /* Smooth transitions for all interactive elements */
    button, input, select, textarea {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Enhanced focus states */
    button:focus-visible,
    input:focus-visible,
    select:focus-visible {
        outline: 3px solid rgba(102, 126, 234, 0.5);
        outline-offset: 2px;
    }

    /* Glass morphism for main card on hover */
    .st-main:hover {
        backdrop-filter: blur(25px) saturate(200%);
        -webkit-backdrop-filter: blur(25px) saturate(200%);
    }

    /* Shimmer effect for warehouse picker */
    .st-warehouse-picker {
        position: relative;
        overflow: hidden;
    }

    .st-warehouse-picker::after {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(14, 165, 233, 0.2), transparent);
        animation: warehouseShimmer 3s ease-in-out infinite;
    }

    @keyframes warehouseShimmer {
        0% { left: -100%; }
        50%, 100% { left: 100%; }
    }

    /* Loading state animation */
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    /* Pulsating effect for active direction button */
    .st-direction-btn.active {
        animation: activePulse 2s ease-in-out infinite;
    }

    @keyframes activePulse {
        0%, 100% {
            box-shadow: 0 4px 12px rgba(245, 158, 66, 0.4);
        }
        50% {
            box-shadow: 0 6px 20px rgba(245, 158, 66, 0.6), 0 0 0 4px rgba(245, 158, 66, 0.1);
        }
    }

    /* Smooth scale animation for inputs on focus */
    input:focus, select:focus, textarea:focus {
        transform: scale(1.01);
    }

    /* Button press effect */
    button:active {
        transform: scale(0.98);
    }

    /* Large dialog buttons for all frappe dialogs */
    .modal-dialog .modal-footer .btn {
        padding: 16px 32px !important;
        font-size: 1.15em !important;
        font-weight: 600 !important;
        border-radius: 12px !important;
        min-width: 120px !important;
        min-height: 52px !important;
    }
    .modal-dialog .modal-footer .btn-primary {
        background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%) !important;
        border: none !important;
        box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3) !important;
    }
    .modal-dialog .modal-footer .btn-primary:hover {
        background: linear-gradient(135deg, #16a34a 0%, #15803d 100%) !important;
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(34, 197, 94, 0.4) !important;
    }
    .modal-dialog .modal-footer .btn-secondary,
    .modal-dialog .modal-footer .btn-default {
        background: linear-gradient(135deg, #64748b 0%, #475569 100%) !important;
        border: none !important;
        color: white !important;
        box-shadow: 0 4px 12px rgba(100, 116, 139, 0.3) !important;
    }
    .modal-dialog .modal-footer .btn-secondary:hover,
    .modal-dialog .modal-footer .btn-default:hover {
        background: linear-gradient(135deg, #475569 0%, #334155 100%) !important;
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(100, 116, 139, 0.4) !important;
    }

    /* Enhanced msgprint/alert messages - larger, centered, colorful */
    .msgprint-dialog .modal-dialog {
        max-width: 450px !important;
        margin: 15vh auto !important;
    }
    .msgprint-dialog .modal-content {
        border-radius: 20px !important;
        overflow: hidden !important;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
    }
    .msgprint-dialog .modal-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        border: none !important;
        padding: 18px 24px !important;
    }
    .msgprint-dialog .modal-header .modal-title {
        color: white !important;
        font-size: 1.3em !important;
        font-weight: 700 !important;
    }
    .msgprint-dialog .modal-header .close,
    .msgprint-dialog .modal-header .btn-close {
        color: white !important;
        opacity: 0.9 !important;
        font-size: 1.5em !important;
    }
    .msgprint-dialog .modal-body {
        padding: 28px 24px !important;
        font-size: 1.15em !important;
        text-align: center !important;
        color: #334155 !important;
        line-height: 1.6 !important;
    }
    .msgprint-dialog .modal-footer {
        padding: 16px 24px 24px !important;
        border: none !important;
        justify-content: center !important;
    }
    .msgprint-dialog .modal-footer .btn {
        min-width: 140px !important;
        padding: 14px 28px !important;
    }
    /* Green indicator */
    .msgprint-dialog.modal-success .modal-header,
    .msgprint-dialog .indicator-pill.green ~ .modal-header {
        background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%) !important;
    }
    /* Red indicator */
    .msgprint-dialog.modal-danger .modal-header {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
    }
    /* Orange/warning indicator */
    .msgprint-dialog.modal-warning .modal-header {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important;
    }
  </style>`;

  $(wrapper).html(`<div class="st-main">${css}
    <div class="st-header">
      <div class="st-direction-buttons">
        <button class="st-direction-btn active" data-direction="in">${TEXT.DIRECTION_IN}</button>
        <button class="st-direction-btn" data-direction="out">${TEXT.DIRECTION_OUT}</button>
      </div>
      <div class="st-header-actions">
        <button class="st-header-action-btn st-refresh-btn" id="st-refresh"><i class="fa fa-refresh"></i></button>
        <button class="st-header-action-btn st-home-btn" id="st-home"><i class="fa fa-home"></i> الرئيسية</button>
      </div>
    </div>

    <div class="st-section">
      <label class="st-section-label" id="st-warehouse-label">${TEXT.SOURCE_WH}</label>
      <div class="st-warehouse-picker" id="st-warehouse-picker">
        <div class="st-warehouse-display" id="st-warehouse-display">${TEXT.SELECT_WAREHOUSE}</div>
        <i class="fa fa-chevron-down st-warehouse-icon"></i>
      </div>
      <div class="st-section-hint" id="st-section-hint" style="margin-top:10px;color:#94a3b8;font-weight:600;font-size:0.9em;">
        ${TEXT.HINT_IN}
      </div>
    </div>

    <div class="st-section">
      <label class="st-section-label">${TEXT.BROWSE_ITEMS}</label>
      <button type="button" class="st-browse-btn" id="st-browse-btn"><i class="fa fa-th-large"></i> ${TEXT.BROWSE_ITEMS}</button>
    </div>

    <div class="st-table-wrap">
      <table class="st-table">
        <thead>
          <tr>
            <th style="width:36px;text-align:center;">#</th>
            <th>${TEXT.ITEM}</th>
            <th style="width:90px;text-align:center;">${TEXT.UOM}</th>
            <th style="width:120px;text-align:center;">${TEXT.QTY}</th>
            <th style="width:70px;text-align:center;"></th>
          </tr>
        </thead>
        <tbody id="st-items-body">
          <tr><td colspan="5" class="st-empty">${TEXT.NO_ITEMS}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="st-footer">
      <button class="st-submit-btn" id="st-submit">${TEXT.SUBMIT}</button>
      <div class="st-feedback" id="st-feedback"></div>
    </div>

    <div class="st-warehouse-options" id="st-warehouse-options">
      <div class="st-warehouse-menu">
        <div class="st-warehouse-menu-title">${TEXT.SELECT_WAREHOUSE}</div>
        <div id="st-warehouse-options-list"></div>
        <button class="st-warehouse-close" id="st-warehouse-close">${TEXT.CANCEL}</button>
      </div>
    </div>
  </div>`);

  const state = {
    direction: "in",
    posWarehouse: "",
    company: "",
    warehouses: [],
    otherWarehouse: "",
    items: [],
    sourceItems: [],
    sourceLookup: {},
    itemCatalogDialog: null,
    itemCatalogGrid: null,
    itemCatalogSearch: null,
    itemDetailCache: {},
    allowNegativeStock: false
  };

  async function loadContext() {
    try {
      frappe.dom.freeze(TEXT.LOADING);
      let res = await frappe.call({
        method: "mobile_pos.mobile_pos.page.stock_trans.api.get_context"
      });
      let ctx = res.message || {};
      state.posWarehouse = ctx.warehouse || "";
      state.company = ctx.company || "";
      state.warehouses = Array.isArray(ctx.warehouses) ? ctx.warehouses : [];
      state.allowNegativeStock = ctx.allow_negative_stock ? true : false;
      renderWarehouseOptions();
      if (state.warehouses.length) {
        let defaultOther = state.warehouses.find(w => w !== state.posWarehouse) || "";
        state.otherWarehouse = defaultOther || "";
        $("#st-warehouse-select").val(state.otherWarehouse);
        await refreshSourceItems();
      }
    } catch (err) {
      showFeedback(err.message || err || "Error", "error");
    } finally {
      frappe.dom.unfreeze();
    }
  }

  function renderWarehouseOptions() {
    let $list = $("#st-warehouse-options-list");
    $list.empty();

    (state.warehouses || []).forEach(name => {
      let isPos = name === state.posWarehouse;
      let disabledClass = isPos ? "disabled" : "";
      let selectedClass = (state.otherWarehouse === name) ? "selected" : "";

      $list.append(`
        <div class="st-warehouse-option ${disabledClass} ${selectedClass}"
             data-warehouse="${frappe.utils.escape_html(name)}"
             ${isPos ? '' : `onclick="selectWarehouse('${frappe.utils.escape_html(name).replace(/'/g, "\\'")}')"` }>
          ${frappe.utils.escape_html(name)}${isPos ? ' (مخزن  السياره)' : ''}
        </div>
      `);
    });

    // Update display
    let displayText = state.otherWarehouse || TEXT.SELECT_WAREHOUSE;
    $("#st-warehouse-display").text(displayText);

    updateWarehouseLabel();
  }

  function updateWarehouseLabel() {
    let label = state.direction === "in" ? TEXT.SOURCE_WH : TEXT.TARGET_WH;
    $("#st-warehouse-label").text(label);
    let hint = state.direction === "in" ? TEXT.HINT_IN : TEXT.HINT_OUT;
    $("#st-section-hint").text(hint);
  }

  function showFeedback(msg, type = "success") {
    let cls = type === "success" ? "st-msg st-msg-success" : "st-msg st-msg-error";
    $("#st-feedback").html(`<div class="${cls}">${msg}</div>`);
    if (type === "success") {
      setTimeout(() => $("#st-feedback").empty(), 4000);
    }
  }

  function renderDirectionButtons() {
    $(".st-direction-btn").removeClass("active");
    $(`.st-direction-btn[data-direction="${state.direction}"]`).addClass("active");
    if (state.otherWarehouse === state.posWarehouse) {
      state.otherWarehouse = "";
    }
    renderWarehouseOptions();
  }

  function getSourceWarehouse() {
    return state.direction === "in" ? state.otherWarehouse : state.posWarehouse;
  }

  function getTargetWarehouse() {
    return state.direction === "in" ? state.posWarehouse : state.otherWarehouse;
  }

  async function refreshSourceItems() {
    let source = getSourceWarehouse();
    if (!source) {
      state.sourceItems = [];
      state.sourceLookup = {};
      return;
    }
    try {
      let res = await frappe.call({
        method: "mobile_pos.mobile_pos.page.stock_trans.api.get_items",
        args: { warehouse: source, company: state.company || "" }
      });
      state.sourceItems = Array.isArray(res.message) ? res.message : [];
      state.sourceLookup = {};
      state.sourceItems.forEach(row => {
        state.sourceLookup[row.item_code] = row;
      });
    } catch (err) {
      showFeedback(err.message || err, "error");
    }
  }

  function renderItems() {
    let $body = $("#st-items-body");
    if (!state.items.length) {
      $body.html(`<tr><td colspan="5" class="st-empty">${TEXT.NO_ITEMS}</td></tr>`);
      return;
    }
    let rows = state.items.map((item, index) => {
      return `
        <tr>
          <td style="text-align:center;">${index + 1}</td>
          <td>
            <div>${frappe.utils.escape_html(item.item_name)}</div>
            <div class="st-item-meta">${frappe.utils.escape_html(item.item_code)}</div>
          </td>
          <td style="text-align:center;">${frappe.utils.escape_html(item.uom || "-")}</td>
          <td style="text-align:center;">
            <input type="text" inputmode="decimal" class="st-qty-input" data-idx="${index}" value="${item.qty}">
          </td>
          <td style="text-align:center;">
            <button class="st-remove-btn" data-idx="${index}" title="${TEXT.REMOVE}"><i class="fa fa-trash"></i></button>
          </td>
        </tr>
      `;
    }).join("");
    $("#st-items-body").html(rows);
  }

  // Home navigation
  $(wrapper).on('click', '#st-home', function(e) {
    e.preventDefault();
    window.location.href = "/main";
  });

  // Refresh button - reload the page with confirmation popup (large buttons)
  $(wrapper).on('click', '#st-refresh', function(e) {
    e.preventDefault();
    let $btn = $(this);

    let dialog = new frappe.ui.Dialog({
      title: '',
      fields: [{
        fieldtype: 'HTML',
        fieldname: 'content',
        options: `
          <div style="text-align: center; padding: 20px;">
            <i class="fa fa-refresh" style="font-size: 4em; color: #3b82f6; margin-bottom: 20px; display: block;"></i>
            <h3 style="font-weight: 700; margin-bottom: 12px; font-size: 1.4em;">تحديث الصفحة</h3>
            <p style="color: #64748b; margin-bottom: 25px; font-size: 1.1em;">سيتم إعادة تحميل الصفحة وتحديث جميع البيانات</p>
            <div style="display: flex; gap: 15px; justify-content: center;">
              <button type="button" class="btn st-confirm-yes-btn" style="
                background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                color: white; border: none; padding: 18px 50px; font-size: 1.3em;
                font-weight: 700; border-radius: 16px; min-width: 130px;
                box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4);
              ">نعم</button>
              <button type="button" class="btn st-confirm-no-btn" style="
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                color: white; border: none; padding: 18px 50px; font-size: 1.3em;
                font-weight: 700; border-radius: 16px; min-width: 130px;
                box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
              ">لا</button>
            </div>
          </div>
        `
      }]
    });
    dialog.$wrapper.find('.modal-header').hide();
    dialog.$wrapper.find('.modal-footer').hide();
    dialog.$wrapper.find('.modal-content').css('border-radius', '20px');
    dialog.$wrapper.find('.st-confirm-yes-btn').on('click', function() {
      dialog.hide();
      $btn.find('i').addClass('fa-spin');
      $btn.prop('disabled', true);
      frappe.show_alert({message: 'جاري التحديث...', indicator: 'blue'}, 2);
      setTimeout(() => location.reload(), 500);
    });
    dialog.$wrapper.find('.st-confirm-no-btn').on('click', function() {
      dialog.hide();
    });
    dialog.show();
  });

  async function openCatalog() {
    let source = getSourceWarehouse();
    if (!source) {
      showFeedback(TEXT.WAREHOUSE_REQUIRED, "error");
      return;
    }
    await refreshSourceItems();
    if (!state.sourceItems.length) {
      showFeedback(TEXT.NO_STOCK_ITEMS, "error");
      return;
    }
    if (state.itemCatalogDialog) {
      renderCatalogCards("");
      state.itemCatalogDialog.show();
      setTimeout(() => state.itemCatalogSearch && state.itemCatalogSearch.focus(), 120);
      return;
    }
    state.itemCatalogDialog = new frappe.ui.Dialog({
      title: TEXT.BROWSE_ITEMS,
      size: "large",
      primary_action_label: TEXT.CANCEL,
      primary_action: () => state.itemCatalogDialog.hide(),
      fields: [{ fieldtype: "HTML", fieldname: "catalog_html" }]
    });
    let $body = $(state.itemCatalogDialog.fields_dict.catalog_html.wrapper);
    $body.addClass("st-catalog-wrap");
    $body.html(`
      <div class="st-catalog-toolbar">
        <div class="st-catalog-search">
          <input type="search" id="st-catalog-search" placeholder="${frappe.utils.escape_html(TEXT.SEARCH_ITEMS)}" autocomplete="off">
        </div>
        <button type="button" class="st-add-all-btn" id="st-add-all-btn">${frappe.utils.escape_html(TEXT.ADD_ALL)}</button>
      </div>
      <div class="st-catalog-grid" id="st-catalog-grid"></div>
    `);
    state.itemCatalogSearch = $body.find("#st-catalog-search");
    state.itemCatalogGrid = $body.find("#st-catalog-grid");
    state.itemCatalogSearch.on("input", frappe.utils.debounce(() => {
      renderCatalogCards(state.itemCatalogSearch.val());
    }, 150));
    state.itemCatalogGrid.on("click", ".st-catalog-card", function() {
      if ($(this).hasClass("disabled")) return;
      let code = $(this).data("item");
      let base = state.sourceLookup[code];
      if (base) openItemConfig(base);
    });
    $body.on("click", "#st-add-all-btn", function() {
      addAllAvailableItems();
    });
    renderCatalogCards("");
    state.itemCatalogDialog.show();
    setTimeout(() => state.itemCatalogSearch && state.itemCatalogSearch.focus(), 120);
  }

  function addItemDirect(baseItem) {
    let available = toFloat(baseItem.actual_qty);
    if (!available || available <= 0) {
      showFeedback(TEXT.NO_STOCK_ITEMS, "error");
      return;
    }
    let uom = baseItem.stock_uom || baseItem.uom || "";
    let existingIdx = state.items.findIndex(it => it.item_code === baseItem.item_code && (it.uom || "") === (uom || ""));
    if (existingIdx >= 0) {
      state.items[existingIdx].qty = available;
      state.items[existingIdx].conversion_factor = 1;
    } else {
      state.items.unshift({
        item_code: baseItem.item_code,
        item_name: baseItem.item_name || baseItem.item_code,
        uom,
        conversion_factor: 1,
        qty: available
      });
    }
    renderItems();
    // Use frappe.show_alert to show on top of dialogs
    frappe.show_alert({
      message: `<i class="fa fa-check-circle"></i> ${TEXT.ITEM_ADDED}`,
      indicator: 'green'
    }, 3);
  }

  function addAllAvailableItems() {
    if (!state.sourceItems.length) {
      showFeedback(TEXT.NO_STOCK_ITEMS, "error");
      return;
    }
    let added = 0;
    state.sourceItems.forEach(src => {
      let available = toFloat(src.actual_qty);
      if (!available || available <= 0) return;
      let uom = src.stock_uom || src.uom || "";
      let existingIdx = state.items.findIndex(it => it.item_code === src.item_code && (it.uom || "") === (uom || ""));
      if (existingIdx >= 0) {
        state.items[existingIdx].qty = available;
        state.items[existingIdx].conversion_factor = 1;
      } else {
        state.items.unshift({
          item_code: src.item_code,
          item_name: src.item_name || src.item_code,
          uom,
          conversion_factor: 1,
          qty: available
        });
      }
      added += 1;
    });
    if (!added) {
      showFeedback(TEXT.NO_STOCK_ITEMS, "error");
      return;
    }
    renderItems();
    // Use frappe.show_alert to show on top of dialogs
    frappe.show_alert({
      message: `<i class="fa fa-check-circle"></i> ${TEXT.ITEM_ADDED}`,
      indicator: 'green'
    }, 3);
    state.itemCatalogDialog && state.itemCatalogDialog.hide();
  }

  function renderCatalogCards(term) {
    if (!state.itemCatalogGrid) return;
    let normalized = (term || "").toLowerCase();
    let filtered = !normalized ? state.sourceItems.slice() : state.sourceItems.filter(item => {
      return (item.item_code || "").toLowerCase().includes(normalized)
          || (item.item_name || "").toLowerCase().includes(normalized);
    });
    if (!filtered.length) {
      state.itemCatalogGrid.html(`<div class="st-empty">${TEXT.NO_STOCK_ITEMS}</div>`);
      return;
    }
    let html = filtered.map(item => {
      let qtyText = TEXT.AVAILABLE(frappe.format(item.actual_qty, { fieldtype: "Float", precision: 2 }));
      let itemCodeEsc = frappe.utils.escape_html(item.item_code);
      return `
        <div class="st-catalog-card" data-item="${itemCodeEsc}">
          <div class="st-catalog-title">${frappe.utils.escape_html(item.item_name || item.item_code)}</div>
          <div class="st-catalog-sub">${itemCodeEsc}</div>
          <div class="st-catalog-qty">${qtyText}</div>
        </div>
      `;
    }).join("");
    state.itemCatalogGrid.html(html);
  }

  async function openItemConfig(baseItem) {
    try {
      let sourceWarehouse = getSourceWarehouse();
      if (!sourceWarehouse) {
        showFeedback(TEXT.WAREHOUSE_REQUIRED, "error");
        return;
      }
      let detail = state.itemDetailCache[`${baseItem.item_code}::${sourceWarehouse}`];
      if (!detail) {
        let res = await frappe.call({
          method: "mobile_pos.mobile_pos.page.stock_trans.api.get_item_details",
          args: { item_code: baseItem.item_code, warehouse: sourceWarehouse },
          freeze: true,
          freeze_message: TEXT.DETAIL_LOADING
        });
        detail = res.message || {};
        state.itemDetailCache[`${baseItem.item_code}::${sourceWarehouse}`] = detail;
      }
      let dialog = new frappe.ui.Dialog({
        title: frappe.utils.escape_html(detail.item_name || baseItem.item_name),
        primary_action_label: TEXT.ADD,
        secondary_action_label: TEXT.CANCEL,
        secondary_action: () => dialog.hide(),
        fields: [
          { fieldtype: "HTML", fieldname: "preview" },
          { fieldtype: "HTML", fieldname: "uom_html" },
          { fieldtype: "HTML", fieldname: "qty_html" }
        ]
      });
      let $preview = $(dialog.fields_dict.preview.wrapper);
      $preview.html(`
        <div class="st-dialog-item-name">${frappe.utils.escape_html(detail.item_name || baseItem.item_name)}</div>
        <div class="st-dialog-item-meta">${frappe.utils.escape_html(detail.item_code)}</div>
        ${detail.description ? `<div class="st-dialog-item-meta" style="margin-top:6px;">${frappe.utils.escape_html(detail.description)}</div>` : ""}
        <div class="st-dialog-stock">${TEXT.AVAILABLE(frappe.format(detail.actual_qty, { fieldtype: "Float", precision: 2 }))}</div>
      `);
      let uoms = Array.isArray(detail.uoms) && detail.uoms.length ? detail.uoms : [{ uom: detail.stock_uom, conversion_factor: 1 }];
      let selectedUom = detail.default_uom || (uoms[0] && uoms[0].uom) || baseItem.stock_uom;
      let $uomWrapper = $(dialog.fields_dict.uom_html.wrapper);
      $uomWrapper.html(`
        <div class="st-uom-buttons">
          ${uoms.map(row => `
            <button type="button" class="st-uom-btn${row.uom === selectedUom ? " active" : ""}" data-uom="${frappe.utils.escape_html(row.uom)}" data-factor="${row.conversion_factor}">
              ${frappe.utils.escape_html(row.uom)}
            </button>
          `).join("")}
        </div>
      `);
      $uomWrapper.on("click", ".st-uom-btn", function() {
        $uomWrapper.find(".st-uom-btn").removeClass("active");
        $(this).addClass("active");
        selectedUom = $(this).data("uom");
      });
      let $qtyWrapper = $(dialog.fields_dict.qty_html.wrapper);
      $qtyWrapper.html(`<input type="text" id="st-dialog-qty" class="st-dialog-qty-input" inputmode="decimal" value="1">`);
      let qtyInput = $qtyWrapper.find("#st-dialog-qty");

      // Arabic to English number conversion for dialog quantity input
      qtyInput.on("input", function() {
        let cursorPos = this.selectionStart;
        let oldValue = $(this).val();
        let value = convertArabicToEnglishNumbers(oldValue);

        if (value !== oldValue) {
          $(this).val(value);
          // Restore cursor position
          this.setSelectionRange(cursorPos, cursorPos);
        }
      });

      // Select all on focus/click
      qtyInput.on("focus click", function() {
        $(this).select();
      });

      dialog.set_primary_action(TEXT.ADD, () => {
        let value = convertArabicToEnglishNumbers(qtyInput.val());
        let qty = parseFloat(value);
        if (!qty || qty <= 0) {
          frappe.msgprint(TEXT.INVALID_QTY);
          return;
        }
        let factor = 1;
        let uomRow = uoms.find(row => row.uom === selectedUom);
        if (uomRow) factor = toFloat(uomRow.conversion_factor) || 1;
        // Skip stock validation if negative stock is allowed
        if (!state.allowNegativeStock) {
          let available = toFloat(detail.actual_qty);
          if (available > 0 && qty * factor > available + 1e-9) {
            frappe.msgprint(TEXT.QTY_LIMIT);
            return;
          }
        }
        let existingIdx = state.items.findIndex(it => it.item_code === baseItem.item_code && it.uom === selectedUom);
        if (existingIdx >= 0) {
          state.items[existingIdx].qty = toFloat(state.items[existingIdx].qty) + qty;
        } else {
          state.items.unshift({
            item_code: baseItem.item_code,
            item_name: baseItem.item_name,
            uom: selectedUom,
            conversion_factor: factor,
            qty: qty
          });
        }
        renderItems();
        dialog.hide();
        // Keep catalog dialog open so user can add more items
        // User will close it manually when done
        // Use frappe.show_alert to show on top of dialogs
        frappe.show_alert({
          message: `<i class="fa fa-check-circle"></i> ${TEXT.ITEM_ADDED}`,
          indicator: 'green'
        }, 3);
      });
      dialog.show();
      setTimeout(() => qtyInput.focus(), 120);
    } catch (err) {
      showFeedback(err.message || err, "error");
    }
  }

  function sanitizeQty(idx, value) {
    value = parseFloat(value);
    if (!value || value <= 0) {
      showFeedback(TEXT.INVALID_QTY, "error");
      return state.items[idx].qty;
    }
    // Skip stock validation if negative stock is allowed
    if (state.allowNegativeStock) {
      return value;
    }
    let item = state.items[idx];
    let sourceInfo = state.sourceLookup[item.item_code];
    if (sourceInfo && sourceInfo.actual_qty) {
      let available = toFloat(sourceInfo.actual_qty);
      let required = value * (item.conversion_factor || 1);
      if (available > 0 && required > available + 1e-9) {
        showFeedback(TEXT.QTY_LIMIT, "error");
        return state.items[idx].qty;
      }
    }
    return value;
  }

  async function submitTransfer() {
    let source = getSourceWarehouse();
    let target = getTargetWarehouse();
    if (state.direction === "in" && !state.otherWarehouse) {
      frappe.show_alert({
        message: `<i class="fa fa-exclamation-circle"></i> ${TEXT.WAREHOUSE_REQUIRED}`,
        indicator: 'orange'
      }, 4);
      return;
    }
    if (state.direction === "out" && !state.otherWarehouse) {
      frappe.show_alert({
        message: `<i class="fa fa-exclamation-circle"></i> ${TEXT.WAREHOUSE_REQUIRED}`,
        indicator: 'orange'
      }, 4);
      return;
    }
    if (!state.items.length) {
      frappe.show_alert({
        message: `<i class="fa fa-exclamation-circle"></i> ${TEXT.ITEMS_REQUIRED}`,
        indicator: 'orange'
      }, 4);
      return;
    }

    // Calculate total items count
    let totalItems = state.items.length;
    let directionLabel = state.direction === "in" ? TEXT.DIRECTION_IN : TEXT.DIRECTION_OUT;
    // Transfer type label: in = تحميل (loading), out = تفريغ (unloading)
    let transferTypeLabel = state.direction === "in" ? "تحميل" : "تفريغ";
    let transferTypeColor = state.direction === "in" ? "#22c55e" : "#f59e0b";
    let transferTypeBg = state.direction === "in" ? "rgba(34, 197, 94, 0.1)" : "rgba(245, 158, 11, 0.1)";

    // Show confirmation dialog before transfer
    let confirmDialog = new frappe.ui.Dialog({
      title: '',
      fields: [{
        fieldtype: 'HTML',
        fieldname: 'content',
        options: `
          <div style="text-align: center; padding: 20px;">
            <i class="fa fa-exchange" style="font-size: 4em; color: #3b82f6; margin-bottom: 20px; display: block;"></i>
            <h3 style="font-weight: 700; margin-bottom: 12px; font-size: 1.4em;">تأكيد التحويل</h3>
            <div style="display: inline-block; background: ${transferTypeBg}; border: 2px solid ${transferTypeColor}; border-radius: 12px; padding: 10px 24px; margin-bottom: 15px;">
              <span style="font-weight: 700; font-size: 1.3em; color: ${transferTypeColor};">${transferTypeLabel}</span>
            </div>
            <p style="color: #64748b; margin-bottom: 10px; font-size: 1.1em;">هل أنت متأكد من تحويل المخزون؟</p>
            <div style="background: #f8fafc; border-radius: 12px; padding: 15px; margin: 15px 0; border: 1px solid #e2e8f0; text-align: right; direction: rtl;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #64748b;">نوع التحويل:</span>
                <span style="font-weight: 700; color: ${transferTypeColor};">${transferTypeLabel}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #64748b;">الاتجاه:</span>
                <span style="font-weight: 600; color: #1e293b;">${directionLabel}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #64748b;">من:</span>
                <span style="font-weight: 600; color: #1e293b;">${frappe.utils.escape_html(source)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #64748b;">إلى:</span>
                <span style="font-weight: 600; color: #1e293b;">${frappe.utils.escape_html(target)}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">عدد الأصناف:</span>
                <span style="font-weight: 700; color: #3b82f6;">${totalItems}</span>
              </div>
            </div>
            <div style="display: flex; gap: 15px; justify-content: center; margin-top: 25px;">
              <button type="button" class="btn st-transfer-yes-btn" style="
                background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                color: white;
                border: none;
                padding: 18px 50px;
                font-size: 1.3em;
                font-weight: 700;
                border-radius: 16px;
                min-width: 130px;
                box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4);
              ">نعم</button>
              <button type="button" class="btn st-transfer-no-btn" style="
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                color: white;
                border: none;
                padding: 18px 50px;
                font-size: 1.3em;
                font-weight: 700;
                border-radius: 16px;
                min-width: 130px;
                box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
              ">لا</button>
            </div>
          </div>
        `
      }]
    });
    confirmDialog.$wrapper.find('.modal-header').hide();
    confirmDialog.$wrapper.find('.modal-footer').hide();
    confirmDialog.$wrapper.find('.modal-content').css('border-radius', '20px');
    confirmDialog.$wrapper.find('.st-transfer-yes-btn').on('click', async function() {
      confirmDialog.hide();
      // Execute the transfer
      try {
        frappe.dom.freeze(TEXT.LOADING);
        let payload = {
          direction: state.direction,
          counterpart_warehouse: state.otherWarehouse,
          items: state.items.map(it => ({
            item_code: it.item_code,
            qty: it.qty,
            uom: it.uom,
            conversion_factor: it.conversion_factor
          }))
        };
        // Store items for printing before clearing
        let itemsForPrint = state.items.map(it => ({
          item_code: it.item_code,
          item_name: it.item_name || it.item_code,
          qty: it.qty,
          uom: it.uom || ""
        }));
        let totalQtyForPrint = state.items.reduce((sum, it) => sum + toFloat(it.qty), 0);

        let res = await frappe.call({
          method: "mobile_pos.mobile_pos.page.stock_trans.api.create_transfer",
          args: payload
        });
        let docname = res.message && res.message.name;
        let isDraft = res.message && res.message.docstatus === 0;
        let msg = TEXT.TRANSFER_SUCCESS + (docname ? ` (${docname})` : "");
        if (isDraft) {
          msg += ` ${TEXT.DRAFT_HINT}`;
        }
        frappe.show_alert({
          message: `<i class="fa fa-check-circle"></i> ${msg}`,
          indicator: 'green'
        }, 5);

        // Print stock transfer receipt on terminal device
        printStockTransfer({
          name: docname || "",
          transfer_type: transferTypeLabel,
          source_warehouse: source,
          target_warehouse: target,
          date: frappe.datetime.nowdate(),
          time: frappe.datetime.now_time().substring(0, 5),
          pos_profile: state.posWarehouse || "",
          items: itemsForPrint,
          total_items: itemsForPrint.length,
          total_qty: totalQtyForPrint
        });

        state.items = [];
        renderItems();
      } catch (err) {
        frappe.show_alert({
          message: `<i class="fa fa-times-circle"></i> ${err.message || err}`,
          indicator: 'red'
        }, 5);
      } finally {
        frappe.dom.unfreeze();
      }
    });
    confirmDialog.$wrapper.find('.st-transfer-no-btn').on('click', function() {
      confirmDialog.hide();
    });
    confirmDialog.show();
  }

  // EVENT HANDLERS
  $(wrapper).on("click", ".st-direction-btn", async function() {
    let dir = $(this).data("direction");
    if (!dir || state.direction === dir) return;
    state.direction = dir;
    renderDirectionButtons();
    state.items = [];
    renderItems();
    await refreshSourceItems();
  });

  // Warehouse picker handlers
  window.selectWarehouse = async function(warehouseName) {
    state.otherWarehouse = warehouseName;
    $("#st-warehouse-options").removeClass("active");
    renderWarehouseOptions();
    await refreshSourceItems();
  };

  $(wrapper).on("click", "#st-warehouse-picker", function() {
    $("#st-warehouse-options").addClass("active");
  });

  $(wrapper).on("click", "#st-warehouse-close", function() {
    $("#st-warehouse-options").removeClass("active");
  });

  $(wrapper).on("click", "#st-warehouse-options", function(e) {
    if ($(e.target).is("#st-warehouse-options")) {
      $("#st-warehouse-options").removeClass("active");
    }
  });


  $(wrapper).on("click", "#st-browse-btn", function() {
    openCatalog();
  });

  $(wrapper).on("click", ".st-remove-btn", function() {
    let idx = parseInt($(this).data("idx"), 10);
    if (idx >= 0) {
      state.items.splice(idx, 1);
      renderItems();
    }
  });

  $(wrapper).on("change", ".st-qty-input", function() {
    let idx = parseInt($(this).data("idx"), 10);
    if (idx < 0) return;
    let value = convertArabicToEnglishNumbers($(this).val());
    let sanitized = sanitizeQty(idx, value);
    state.items[idx].qty = sanitized;
    $(this).val(sanitized);
  });

  // Arabic to English number conversion on input for quantity fields
  $(wrapper).on("input", ".st-qty-input", function() {
    let cursorPos = this.selectionStart;
    let oldValue = $(this).val();
    let value = convertArabicToEnglishNumbers(oldValue);

    if (value !== oldValue) {
      $(this).val(value);
      // Restore cursor position
      this.setSelectionRange(cursorPos, cursorPos);
    }
  });

  // Select all text on focus/click for quantity inputs
  $(wrapper).on("focus click", ".st-qty-input", function() {
    $(this).select();
  });

  $(wrapper).on("click", "#st-submit", function() {
    submitTransfer();
  });

  await loadContext();
  renderItems();
};