if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/service-worker.js').then(function(registration) {
      // SW registered!
    }, function(err) {
      console.error('SW registration failed: ', err);
    });
  });
}
frappe.pages['mini-pos'].on_page_load = async function(wrapper) {
    // Hide default Frappe navbar for this page and restore on leave
(function hideNavbarForMiniPOS() {
  // Utility guards
  const hide = () => {
    const $nb = $('.navbar, .navbar-default, .page-head, header.navbar');
    $nb.attr('data-mini-pos-hidden', '1').css('display', 'none');
    // Also hide desk page-head toolbar area if present
    $('.page-head, .page-head-content, .page-head .container').css('display', 'none');
  };
  const show = () => {
    const $nb = $('.navbar, .navbar-default, .page-head, header.navbar');
    $nb.filter('[data-mini-pos-hidden="1"]').css('display', '');
    $('.page-head, .page-head-content, .page-head .container').css('display', '');
    $nb.removeAttr('data-mini-pos-hidden');
  };

  // If we are already on the mini-pos route, hide immediately
  try {
    if (frappe && frappe.get_route && frappe.get_route && frappe.get_route()[0] === 'mini-pos') {
      hide();
    }
  } catch (e) {}

  // On page load of mini-pos, hide
  const original_on_load = frappe.pages['mini-pos'] && frappe.pages['mini-pos'].on_page_load;
  frappe.pages['mini-pos'].on_page_load = async function(wrapper) {
    hide();
    if (typeof original_on_load === 'function') {
      return original_on_load(wrapper);
    }
  };

  // When the page is shown again (SPA nav), ensure hidden
  const page = frappe.pages['mini-pos'];
  if (page) {
    const orig_show = page.show;
    page.show = function() {
      hide();
      if (typeof orig_show === 'function') return orig_show.apply(this, arguments);
    };
  }

  // Restore when navigating away from mini-pos
  $(window).on('hashchange.mini_pos_navbar', function() {
    try {
      const r = frappe.get_route ? frappe.get_route() : [];
      if (r[0] === 'mini-pos') {
        hide();
      } else {
        show();
      }
    } catch(e) {
      // If routing API not available, do nothing
    }
  });

  // Also restore on page unload hard navigate
  window.addEventListener('beforeunload', show);

  // Safety: when desk triggers global page change event
  $(document).on('page-change.mini_pos_navbar', function() {
    try {
      const r = frappe.get_route ? frappe.get_route() : [];
      if (r[0] === 'mini-pos') hide(); else show();
    } catch(e) {}
  });
})();
    // --- Utility functions ---
    const toInt = val => parseInt(val, 10) || 0;
    const escape_html = str => (typeof frappe !== "undefined" && frappe.utils && frappe.utils.escape_html)
        ? frappe.utils.escape_html(str)
        : String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    const format_number = val => Number(val || 0).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
    const format_int = val => Number(val || 0).toLocaleString('en-US', {maximumFractionDigits:0});
    const format_currency_text = val => format_number(val);
    const format_float_text = val => format_number(val);
    const TEXT = {
        NO_PAYMENT: "بدون دفعة",
        NO_PROFILE_TITLE: "لم يتم العثور على ملف",
        NO_PROFILE_MSG: "لا يوجد ملف لهذا المستخدم. يرجى التواصل مع المسؤول.",
        NO_MATCHES: "لا توجد نتائج مطابقة",
        TOTAL: "الإجمالي",
        TAX: "الضريبة",
        GRAND_TOTAL: "الإجمالي الكلي",
        NO_RECORDS: "لا توجد سجلات.",
        NO_ITEMS_MATCH: "لا توجد أصناف تطابق بحثك",
        NO_PRICE: "لا يوجد سعر",
        AVAILABILITY_UNKNOWN: "توفر غير معروف",
        IN_STOCK: qty => `متوفر · ${qty}`,
        OUT_OF_STOCK: "غير متوفر",
        BROWSE_ITEMS: "تصفح الأصناف",
        CLOSE: "إغلاق",
        REFRESH: "تحديث",
        REFRESH_PAGE_TITLE: "إعادة تعيين النموذج",
        FILTER_AVAILABLE_ONLY: "المتوفر فقط",
        FILTER_ALL_GROUPS: "كل الفئات",
        SEARCH_ITEMS: "ابحث عن صنف",
        LOADING_ITEM: "جاري تحميل بيانات الصنف...",
        LOAD_ITEM_ERROR: "تعذر تحميل بيانات الصنف.",
        DEFAULT_UOM: "وحدة",
        ADD_ITEM: name => `إضافة ${name}`,
        ADD: "إضافة",
        UOM: "وحدة القياس",
        QUANTITY: "الكمية",
        RATE: "السعر",
        QTY_GT_ZERO: "يجب أن تكون الكمية أكبر من صفر.",
        RATE_GT_ZERO: "يجب أن يكون السعر أكبر من صفر.",
        AVAILABLE: "متوفر",
        RATE_LABEL: "السعر",
        NO_ITEMS_AVAILABLE: "لا توجد أصناف متاحة.",
        SEARCH_PAYMENT_MODE: "ابحث عن وسيلة الدفع",
        MODE_OF_PAYMENT: "وسيلة الدفع",
        NO_PAYMENT_MODES: "لا توجد وسائل دفع متاحة",
        NO_CUSTOMERS_MATCH: "لا يوجد عملاء مطابقون لبحثك",
        RETURN_MODE_BLOCK: "لا يمكن إضافة أصناف أثناء معالجة المرتجع.",
        STOCK_TRANSACTION: "حركة المخزون",
        SUBMIT: "إرسال",
        WORKING: "جاري التنفيذ...",
        ITEM_LABEL: "الصنف",
        QTY_LABEL: "الكمية",
        AMOUNT: "المبلغ",
        VALID_AMOUNT: "يرجى إدخال مبلغ صحيح.",
        PAYMENT_ENTRY_CREATED: name => `تم إنشاء سند الدفع ${name}.`,
        PAYMENT_FAILED: "تعذر تنفيذ الدفع.",
        RECEIVE_PAYMENT: "استلام دفعة",
        CANCEL_INVOICE: "إلغاء فاتورة",
        CANCEL_INVOICE_TITLE: "إلغاء فاتورة",
        SELECT_INVOICE_TO_CANCEL: "اختر فاتورة للإلغاء",
        INVOICE_CANCELLED: name => `تم إلغاء الفاتورة ${name} بنجاح.`,
        CANCEL_INVOICE_FAILED: "فشل إلغاء الفاتورة.",
        NO_INVOICES_TO_CANCEL: "لا توجد فواتير قابلة للإلغاء لهذا العميل.",
        SUBMIT_BTN: "إرسال",
        NO_INVOICES_FOUND: "لم يتم العثور على فواتير لهذا العميل.",
        INVOICE_TO_RETURN: "الفاتورة المراد إرجاعها",
        SELECT_INVOICE_RETURN: "اختر الفاتورة للإرجاع",
        RETURN_ITEMS_HINT: "تم تحميل أصناف المرتجع. أدخل كميات سالبة (الحد الأدنى هو الكمية الأصلية).",
        CUSTOMER_LEDGER: "كشف حساب العميل",
        POS_BALANCE: "رصيد نقاط البيع",
        STOCK_BALANCE: "رصيد المخزون",
        CUSTOMER: "العميل",
        ADD_CUSTOMER: "إضافة عميل",
        CUSTOMER_PLACEHOLDER: "اكتب أو اختر العميل",
        ITEMS: "الأصناف",
        NEW_INVOICE_TITLE: "فاتورة جديدة",
        NEW: "جديد",
        PRINT: "طباعة",
        NEW_INVOICE_LINK: "فاتورة جديدة",
        MINI_POS_TITLE: "نقاط البيع المصغرة",
        MINI_POS_SUB: "مبيعات سريعة وسهلة للجميع",
        SHOW_ACTIONS: "إظهار الإجراءات",
        HIDE_ACTIONS: "إخفاء الإجراءات",
        RETURN: "مرتجع",
        LEDGER: "كشف حساب",
        POS_BALANCE_BTN: "رصيد الخزنه ",
        STOCK: "رصيد المخزن",
        PAYMENT: "سند قبض/صرف",
        STOCK_TXN: "حركة المخزون",
        TABLE_ITEM_NAME: "اسم الصنف",
        TABLE_UOM: "الوحدة",
        TABLE_QTY: "الكمية",
        TABLE_RATE: "السعر",
        NO_ITEMS: "لا توجد أصناف",
        SUBMIT_PRINT: "حفظ وطباعة",
        SUCCESS_CREATED_INVOICE: name => `تم إنشاء فاتورة المبيعات ${name} بنجاح!`,
        PLEASE_SELECT_CUSTOMER: "يرجى اختيار العميل.",
        PLEASE_ADD_ITEM: "يرجى إضافة صنف واحد على الأقل.",
        PAYMENT_MODE_REQUIRED: "يرجى اختيار وسيلة الدفع.",
        VALIDATE_CUSTOMER: "يرجى اختيار عميل صالح.",
        VALIDATE_ITEMS: "يرجى إضافة صنف واحد على الأقل.",
        ADD_CUSTOMER_DIALOG: "إضافة عميل",
        ADD_CUSTOMER_CONFIRM: "إنشاء",
        CUSTOMER_CREATED: "تم إنشاء العميل!",
        CUSTOMER_CREATE_ERROR: "تعذر إنشاء العميل.",
        CLEAR: "مسح",
        POS_BALANCE_TITLE: "رصيد نقاط البيع",
        STOCK_BALANCE_TITLE: "رصيد المخزون",
        ADD_ROW: "إضافة صف",
        REMOVE: "حذف",
        TRANSACTION_TYPE: "نوع الحركة",
        ADD_STOCK: "إضافة للمخزون",
        RETURN_STOCK: "إرجاع للمخزون",
        MAIN_WAREHOUSE: "المستودع الرئيسي",
        POS_WAREHOUSE: "مستودع نقاط البيع",
        STOCK_ITEMS: "الأصناف",
        STOCK_DIALOG_HINT: "أضف الأصناف والكميات ثم اضغط إرسال لإتمام الحركة.",
        STOCK_TRANSFER_SUCCESS: "تم تنفيذ تحويل المخزون بنجاح.",
        STOCK_TRANSFER_VALIDATE: "يرجى إضافة صنف واحد على الأقل مع كمية صحيحة.",
        STOCK_TRANSFER_ERROR: "تعذر إتمام عملية تحويل المخزون.",
        DISCOUNT: "الخصم",
        PAID_AMOUNT: "المبلغ المدفوع",
        RETURNED_AMOUNT: "المبلغ المسترجع",
        CUSTOMER_FULL_NAME: "الاسم الكامل",
        CUSTOMER_FULL_NAME_DESC: "أدخل الاسم الكامل للعميل",
        CUSTOMER_MOBILE: "رقم الجوال",
        CUSTOMER_MOBILE_DESC: "مثال: 01012345678 (11 رقم)",
        CUSTOMER_MOBILE_INVALID: "رقم الجوال غير صحيح. يجب أن يبدأ بـ 010, 011, 012, أو 015 ويتكون من 11 رقم",
        CUSTOMER_TAX_ID: "الرقم الضريبي",
        CUSTOMER_CR: "رقم السجل التجاري",
        SUBMITTING: "جارٍ الحفظ...",
        RETURN_INVOICE_ERROR: "تعذر إنشاء فاتورة المرتجع.",
        LOAD_INVOICE_ERROR: "تعذر تحميل بيانات الفاتورة.",
        FETCH_INVOICES_ERROR: "تعذر جلب الفواتير.",
        FETCH_LEDGER_ERROR: "تعذر جلب كشف الحساب.",
        FETCH_POS_BALANCE_ERROR: "تعذر جلب رصيد نقاط البيع.",
        FETCH_STOCK_ERROR: "تعذر جلب بيانات المخزون.",
        INVOICE_HISTORY: "سجل الفواتير",
        INVOICE_HISTORY_TITLE: "فواتير العميل",
        FETCH_INVOICE_HISTORY_ERROR: "تعذر جلب سجل الفواتير.",
        INVOICE_DETAILS: "تفاصيل الفاتورة",
        INVOICE_DATE: "تاريخ الفاتورة",
        INVOICE_TOTAL: "إجمالي الفاتورة",
        INVOICE_STATUS: "الحالة",
        NO_CUSTOMER_INVOICES: "لا توجد فواتير لهذا العميل.",
        VIEW_INVOICE: "عرض",
        REPRINT_INVOICE: "إعادة طباعة",
        RETURN_QTY_INVALID: "يجب أن تكون كمية المرتجع سالبة ولا تتجاوز الكمية الأصلية.",
        RETURN_QTY_REQUIRED: "يرجى إدخال صنف واحد على الأقل بكمية مرتجعة سالبة.",
        RETURN_MIN_HINT: "الحد الأدنى",
        LEDGER_DATE: "التاريخ",
        LEDGER_TYPE: "نوع المستند",
        LEDGER_NO: "رقم المستند",
        LEDGER_DEBIT: "مدين",
        LEDGER_CREDIT: "دائن",
        LEDGER_BALANCE: "الرصيد",
        POS_MODE: "وسيلة الدفع",
        POS_ACCOUNT: "الحساب",
        STOCK_ITEM_CODE: "كود الصنف",
        STOCK_ITEM_NAME: "اسم الصنف",
        STOCK_QTY: "الكمية المتاحة",
        SELECT_CUSTOMER_FIRST: "يرجى اختيار العميل أولاً.",
        GENERIC_ERROR: "حدث خطأ غير متوقع.",
        CUSTOMER_DISCOUNT: "خصم للعميل",
        DISCOUNT_TYPE: "نوع الخصم",
        DISCOUNT_AMOUNT: "مبلغ الخصم",
        DISCOUNT_REMARKS: "ملاحظات",
        SELECT_DISCOUNT_TYPE: "اختر نوع الخصم",
        NO_DISCOUNT_TYPES: "لا توجد أنواع خصم متاحة",
        DISCOUNT_SUCCESS: name => `تم تسجيل الخصم ${name} بنجاح!`,
        DISCOUNT_FAILED: "فشل تسجيل الخصم.",
        CONFIRM_DISCOUNT: "تأكيد الخصم",
        TOTAL_USER_CREDIT: "إجمالي أرصدة العملاء",
        TOTAL_USER_CREDIT_TITLE: "كشف أرصدة العملاء",
        CREDIT_CUSTOMER_NAME: "اسم العميل",
        CREDIT_BALANCE: "الرصيد",
        CREDIT_TOTAL: "الإجمالي",
        CREDIT_NO_DATA: "لا توجد أرصدة للعملاء.",
        CREDIT_FETCH_ERROR: "تعذر جلب أرصدة العملاء."
    };

    // Custom confirmation dialog with large buttons (same style as refresh)
    function showConfirmDialog({ icon, iconColor, title, message, onConfirm, confirmText = 'نعم', cancelText = 'لا' }) {
        let dialog = new frappe.ui.Dialog({
            title: '',
            fields: [{
                fieldtype: 'HTML',
                fieldname: 'content',
                options: `
                    <div style="text-align: center; padding: 20px;">
                        <i class="fa ${icon}" style="font-size: 4em; color: ${iconColor}; margin-bottom: 20px; display: block;"></i>
                        <h3 style="font-weight: 700; margin-bottom: 12px; font-size: 1.4em;">${title}</h3>
                        <p style="color: #64748b; margin-bottom: 25px; font-size: 1.1em;">${message}</p>
                        <div style="display: flex; gap: 15px; justify-content: center;">
                            <button type="button" class="btn confirm-yes-btn" style="
                                background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                                color: white; border: none; padding: 18px 50px; font-size: 1.3em;
                                font-weight: 700; border-radius: 16px; min-width: 130px;
                                box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4);
                            ">${confirmText}</button>
                            <button type="button" class="btn confirm-no-btn" style="
                                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                                color: white; border: none; padding: 18px 50px; font-size: 1.3em;
                                font-weight: 700; border-radius: 16px; min-width: 130px;
                                box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
                            ">${cancelText}</button>
                        </div>
                    </div>
                `
            }]
        });
        dialog.$wrapper.find('.modal-header').hide();
        dialog.$wrapper.find('.modal-footer').hide();
        dialog.$wrapper.find('.modal-content').css('border-radius', '20px');
        dialog.$wrapper.find('.confirm-yes-btn').on('click', function() {
            dialog.hide();
            if (onConfirm) onConfirm();
        });
        dialog.$wrapper.find('.confirm-no-btn').on('click', function() {
            dialog.hide();
        });
        dialog.show();
        return dialog;
    }

    function tableHtml({ columns, rows }) {
        let tableHeaders = columns.map(col => `<th style="border:1px solid #dbeafe; text-align:${col.align||'right'}; background:#e0f2fe; color:#0284c7; padding:7px;">${escape_html(col.label)}</th>`).join('');
        let tableRows = rows.length ? rows.map(row => `
            <tr>
                ${columns.map(col =>
                    `<td style="border:1px solid #dbeafe; text-align:${col.align||'right'}; padding:7px;">
                        ${
                            col.fieldtype==='Currency'
                                ? format_currency_text(row[col.fieldname])
                                : col.fieldtype==='Float'
                                    ? format_float_text(row[col.fieldname])
                                    : escape_html(row[col.fieldname]||'')
                        }
                    </td>`
                ).join('')}
            </tr>
        `).join('') : `<tr><td colspan="${columns.length}" style="text-align:center;color:#999; border:1px solid #dbeafe;">${TEXT.NO_RECORDS}</td></tr>`;
        return `<div style="overflow-x:auto">
            <table style="border-collapse:collapse;width:100%;background:#fff;border-radius:8px;font-size:1em;box-shadow:0 1px 8px #dbeafe33;min-width:400px;">
                <thead>
                    <tr>${tableHeaders}</tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>`;
    }

    function printTableDialog({ title, company, columns, rows }) {
        // ===== ANDROID NATIVE PRINTING FOR TABLES =====
        if (isAndroidPrinterAvailable()) {
            try {
                // Send structured data for better formatted print
                const printData = {
                    type: 'ledger',
                    title: title || '',
                    customer_name: company || '',  // company param is actually customer name in ledger context
                    company_name: company_print_name || 'Elnoor-النور',
                    company_phone: company_phone || '',
                    columns: columns.map(c => ({
                        label: c.label || c.fieldname,
                        fieldname: c.fieldname,
                        fieldtype: c.fieldtype || 'Data',
                        align: c.align || 'right'
                    })),
                    rows: rows
                };
                Android.printReceipt(JSON.stringify(printData));
                return;
            } catch (e) {
                console.error('Android print error:', e);
            }
        }

        // ===== BROWSER PRINTING (Fallback) =====
        // Build table HTML inline to ensure all data is captured
        let tableHeaders = columns.map(col =>
            `<th style="border:1px solid #60a5fa; text-align:${col.align||'right'}; background:#e0f2fe; color:#0284c7; padding:9px 10px; font-weight:600;">${col.label || col.fieldname}</th>`
        ).join('');

        let tableRows = rows.length ? rows.map(row => `
            <tr>
                ${columns.map(col => {
                    let val = row[col.fieldname];
                    if (val === null || val === undefined) val = '';
                    if (col.fieldtype === 'Currency' && typeof val === 'number') {
                        val = val.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                    }
                    return `<td style="border:1px solid #60a5fa; text-align:${col.align||'right'}; padding:9px 10px;">${val}</td>`;
                }).join('')}
            </tr>
        `).join('') : `<tr><td colspan="${columns.length}" style="text-align:center;color:#999;border:1px solid #60a5fa;padding:20px;">لا توجد بيانات</td></tr>`;

        let html = `<!DOCTYPE html>
            <html dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>${title || 'طباعة'}</title>
                <style>
                    @media print { @page { margin: 10mm; } }
                    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 20px; direction: rtl; text-align: right; }
                    .print-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #0284c7; padding-bottom: 15px; }
                    .print-title { font-weight: 700; font-size: 1.4em; color: #0284c7; margin-bottom: 5px; }
                    .print-company { color: #64748b; font-size: 1.1em; }
                    table { border-collapse: collapse; width: 100%; font-size: 0.95em; margin-top: 15px; }
                    th { background: #e0f2fe; color: #0284c7; }
                    tr:nth-child(even) { background: #f9fafb; }
                    .print-footer { text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; color: #64748b; font-size: 0.85em; }
                </style>
            </head>
            <body>
                <div class="print-header">
                    <div class="print-title">${title || ''}</div>
                    <div class="print-company">${company || ''}</div>
                </div>
                <table>
                    <thead><tr>${tableHeaders}</tr></thead>
                    <tbody>${tableRows}</tbody>
                </table>
                <div class="print-footer">
                    تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA')} - ${new Date().toLocaleTimeString('ar-SA')}
                </div>
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            setTimeout(function() { window.close(); }, 100);
                        }, 250);
                    };
                <\/script>
            </body>
            </html>
        `;
        let win = window.open('', '_blank', 'width=900,height=700');
        win.document.write(html);
        win.document.close();
    }

    function invoicePickerDialog(invoices, callback, title) {
        if (!invoices || invoices.length === 0) {
            showStyledError('تنبيه', 'لا توجد فواتير متاحة');
            return;
        }

        let selectedInvoice = null;

        // Build invoice cards
        let invoiceCards = invoices.map(inv => {
            let dateStr = inv.posting_date ? frappe.datetime.str_to_user(inv.posting_date) : '';
            let amountStr = inv.grand_total ? format_currency_text(inv.grand_total) : '';
            return `
                <div class="invoice-picker-card" data-invoice="${escape_html(inv.name)}" data-display="${escape_html(inv.name)}" style="
                    padding: 12px 15px;
                    border: 2px solid #e5e7eb;
                    border-radius: 10px;
                    cursor: pointer;
                    background: #fff;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    direction: rtl;
                ">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fa fa-file-text-o" style="font-size: 1.1em; color: #9ca3af;"></i>
                        <span style="font-size: 15px; font-weight: 600; color: #374151;">${escape_html(inv.name)}</span>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 2px;">
                        <span style="font-size: 12px; color: #6b7280;">${dateStr}</span>
                        <span style="font-size: 13px; font-weight: 600; color: #059669;">${amountStr}</span>
                    </div>
                </div>
            `;
        }).join('');

        let d = new frappe.ui.Dialog({
            title: title || "اختر الفاتورة",
            fields: [
                {
                    fieldname: 'invoice_selector',
                    fieldtype: 'HTML',
                    options: `
                        <div class="form-group" style="margin-bottom: 15px; position: relative;">
                            <div id="invoice-picker-trigger" style="
                                width: 100%;
                                padding: 12px 15px;
                                border: 1px solid #d1d5db;
                                border-radius: 8px;
                                font-size: 15px;
                                font-weight: 500;
                                background: #fff;
                                color: #9ca3af;
                                cursor: pointer;
                                display: flex;
                                align-items: center;
                                justify-content: space-between;
                                direction: rtl;
                            ">
                                <span id="invoice-picker-display">اختر الفاتورة</span>
                                <i class="fa fa-chevron-down" style="font-size: 12px; color: #9ca3af; transition: transform 0.2s;"></i>
                            </div>
                            <div id="invoice-picker-dropdown" style="
                                display: none;
                                position: absolute;
                                top: 100%;
                                left: 0;
                                right: 0;
                                background: #fff;
                                border: 1px solid #e5e7eb;
                                border-radius: 12px;
                                box-shadow: 0 10px 40px rgba(0,0,0,0.15);
                                z-index: 1000;
                                padding: 10px;
                                margin-top: 5px;
                                max-height: 280px;
                                overflow-y: auto;
                            ">
                                <div style="display: flex; flex-direction: column; gap: 8px;">
                                    ${invoiceCards}
                                </div>
                            </div>
                            <input type="hidden" id="invoice-picker-value" value="">
                        </div>
                    `
                }
            ],
            primary_action_label: '<i class="fa fa-check"></i> تأكيد',
            primary_action: function() {
                if (!selectedInvoice) {
                    showStyledError('تنبيه', 'يرجى اختيار فاتورة');
                    return;
                }
                d.hide();
                if (callback) {
                    callback(selectedInvoice);
                }
            },
            secondary_action_label: '<i class="fa fa-times"></i> إلغاء',
            secondary_action: function() {
                d.hide();
            }
        });

        // Style the dialog
        d.$wrapper.find('.modal-dialog').css({'max-width': '450px'});
        d.$wrapper.find('.modal-content').css({'border-radius': '16px', 'overflow': 'visible'});
        d.$wrapper.find('.modal-body').css({'overflow': 'visible'});
        d.$wrapper.find('.btn-primary').css({
            'background': 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
            'border': 'none',
            'border-radius': '10px',
            'padding': '10px 24px',
            'font-weight': '600'
        });
        d.$wrapper.find('.btn-secondary, .btn-default').css({
            'border-radius': '10px',
            'padding': '10px 24px'
        });

        // Toggle dropdown on trigger click
        d.$wrapper.on('click', '#invoice-picker-trigger', function(e) {
            e.stopPropagation();
            let $dropdown = d.$wrapper.find('#invoice-picker-dropdown');
            let $trigger = $(this);
            let isVisible = $dropdown.is(':visible');

            if (isVisible) {
                $dropdown.slideUp(150);
                $trigger.find('.fa-chevron-down').css('transform', 'rotate(0deg)');
            } else {
                $dropdown.slideDown(150);
                $trigger.find('.fa-chevron-down').css('transform', 'rotate(180deg)');
            }
        });

        // Handle invoice card selection
        d.$wrapper.on('click', '.invoice-picker-card', function(e) {
            e.stopPropagation();
            let $card = $(this);
            let invoiceName = $card.data('invoice');

            // Update hidden input and display
            selectedInvoice = invoiceName;
            d.$wrapper.find('#invoice-picker-value').val(invoiceName);
            d.$wrapper.find('#invoice-picker-display').text(invoiceName).css('color', '#374151');
            d.$wrapper.find('#invoice-picker-trigger').css('border-color', '#2563eb');

            // Reset all cards
            d.$wrapper.find('.invoice-picker-card').css({
                'border-color': '#e5e7eb',
                'background': '#fff'
            });
            d.$wrapper.find('.invoice-picker-card .fa-file-text-o').css('color', '#9ca3af');

            // Mark selected card
            $card.css({
                'border-color': '#2563eb',
                'background': 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)'
            });
            $card.find('.fa-file-text-o').css('color', '#2563eb');

            // Close dropdown
            d.$wrapper.find('#invoice-picker-dropdown').slideUp(150);
            d.$wrapper.find('#invoice-picker-trigger .fa-chevron-down').css('transform', 'rotate(0deg)');
        });

        // Hover effect on cards
        d.$wrapper.on('mouseenter', '.invoice-picker-card', function() {
            let $card = $(this);
            if (selectedInvoice !== $card.data('invoice')) {
                $card.css({
                    'background': '#f9fafb',
                    'border-color': '#d1d5db'
                });
            }
        });
        d.$wrapper.on('mouseleave', '.invoice-picker-card', function() {
            let $card = $(this);
            if (selectedInvoice !== $card.data('invoice')) {
                $card.css({
                    'background': '#fff',
                    'border-color': '#e5e7eb'
                });
            }
        });

        // Close dropdown when clicking outside
        $(document).on('click.invoicePickerDropdown', function(e) {
            if (!$(e.target).closest('#invoice-picker-trigger, #invoice-picker-dropdown').length) {
                d.$wrapper.find('#invoice-picker-dropdown').slideUp(150);
                d.$wrapper.find('#invoice-picker-trigger .fa-chevron-down').css('transform', 'rotate(0deg)');
            }
        });

        // Cleanup on dialog hide
        d.$wrapper.on('hidden.bs.modal', function() {
            $(document).off('click.invoicePickerDropdown');
        });

        d.show();
    }

    // ==================== Android POS Bridge Functions ====================
    // Check if running in Android POS app with Sunyard SDK
    function isAndroidPOSApp() {
        return typeof Android !== 'undefined' && Android.isAvailable && Android.isAvailable();
    }

    // Check if Android printer is available
    function isAndroidPrinterAvailable() {
        return isAndroidPOSApp() && Android.isPrinterAvailable && Android.isPrinterAvailable();
    }

    // Android print callbacks (called from native code)
    window.onPrintSuccess = function(message) {
        console.log('Print success:', message);
        frappe.show_alert({ message: 'تمت الطباعة بنجاح', indicator: 'green' }, 3);
    };

    window.onPrintError = function(error) {
        console.error('Print error:', error);
        showStyledError('خطأ في الطباعة', error);
    };

    // Styled error/warning popup dialog
    function showStyledError(title, message, type = 'error') {
        // Determine colors based on type
        let isWarning = title === 'تنبيه' || type === 'warning';
        let iconBg = isWarning ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)';
        let iconColor = isWarning ? '#d97706' : '#dc2626';
        let titleColor = isWarning ? '#d97706' : '#dc2626';
        let msgBg = isWarning ? '#fffbeb' : '#fef2f2';
        let msgBorder = isWarning ? '#fde68a' : '#fecaca';
        let msgColor = isWarning ? '#92400e' : '#991b1b';
        let btnBg = isWarning ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)';
        let btnShadow = isWarning ? 'rgba(245, 158, 11, 0.3)' : 'rgba(220, 38, 38, 0.3)';
        let icon = isWarning ? 'fa-exclamation-triangle' : 'fa-times';

        let errorDialog = new frappe.ui.Dialog({
            title: '',
            fields: [{
                fieldtype: 'HTML',
                fieldname: 'error_content',
                options: `
                    <div style="text-align: center; padding: 25px;">
                        <div style="
                            width: 70px;
                            height: 70px;
                            background: ${iconBg};
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin: 0 auto 20px;
                        ">
                            <i class="fa ${icon}" style="font-size: 2em; color: ${iconColor};"></i>
                        </div>
                        <h3 style="font-weight: 700; margin-bottom: 15px; font-size: 1.4em; color: ${titleColor};">${title}</h3>
                        <div style="
                            background: ${msgBg};
                            border: 1px solid ${msgBorder};
                            border-radius: 10px;
                            padding: 15px 20px;
                            margin-bottom: 20px;
                            direction: rtl;
                            text-align: right;
                        ">
                            <p style="color: ${msgColor}; font-size: 15px; font-weight: 500; margin: 0; line-height: 1.6;">
                                ${message || 'حدث خطأ غير متوقع'}
                            </p>
                        </div>
                        <button type="button" class="btn error-ok-btn" style="
                            background: ${btnBg};
                            color: white;
                            border: none;
                            padding: 12px 50px;
                            font-size: 1.1em;
                            font-weight: 600;
                            border-radius: 10px;
                            min-width: 120px;
                            box-shadow: 0 4px 15px ${btnShadow};
                        ">حسناً</button>
                    </div>
                `
            }]
        });
        errorDialog.$wrapper.find('.modal-header').hide();
        errorDialog.$wrapper.find('.modal-footer').hide();
        errorDialog.$wrapper.find('.modal-dialog').css({'max-width': '400px'});
        errorDialog.$wrapper.find('.modal-content').css({'border-radius': '20px', 'overflow': 'hidden'});
        errorDialog.$wrapper.find('.error-ok-btn').on('click', function() {
            errorDialog.hide();
        });
        errorDialog.show();
    }

    // Styled success popup dialog
    function showStyledSuccess(title, message, autoClose = true) {
        let successDialog = new frappe.ui.Dialog({
            title: '',
            fields: [{
                fieldtype: 'HTML',
                fieldname: 'success_content',
                options: `
                    <div style="text-align: center; padding: 25px;">
                        <div style="
                            width: 70px;
                            height: 70px;
                            background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin: 0 auto 20px;
                        ">
                            <i class="fa fa-check" style="font-size: 2em; color: #16a34a;"></i>
                        </div>
                        <h3 style="font-weight: 700; margin-bottom: 15px; font-size: 1.4em; color: #16a34a;">${title}</h3>
                        <div style="
                            background: #f0fdf4;
                            border: 1px solid #bbf7d0;
                            border-radius: 10px;
                            padding: 15px 20px;
                            margin-bottom: 20px;
                            direction: rtl;
                            text-align: right;
                        ">
                            <p style="color: #166534; font-size: 15px; font-weight: 500; margin: 0; line-height: 1.6;">
                                ${message || 'تمت العملية بنجاح'}
                            </p>
                        </div>
                        <button type="button" class="btn success-ok-btn" style="
                            background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
                            color: white;
                            border: none;
                            padding: 12px 50px;
                            font-size: 1.1em;
                            font-weight: 600;
                            border-radius: 10px;
                            min-width: 120px;
                            box-shadow: 0 4px 15px rgba(22, 163, 74, 0.3);
                        ">حسناً</button>
                    </div>
                `
            }]
        });
        successDialog.$wrapper.find('.modal-header').hide();
        successDialog.$wrapper.find('.modal-footer').hide();
        successDialog.$wrapper.find('.modal-dialog').css({'max-width': '400px'});
        successDialog.$wrapper.find('.modal-content').css({'border-radius': '20px', 'overflow': 'hidden'});
        successDialog.$wrapper.find('.success-ok-btn').on('click', function() {
            successDialog.hide();
        });
        successDialog.show();

        if (autoClose) {
            setTimeout(() => {
                if (successDialog.$wrapper.is(':visible')) {
                    successDialog.hide();
                }
            }, 3000);
        }
    }

    // Android scan callbacks (called from native code)
    window.onScanSuccess = function(barcode) {
        console.log('Scan success:', barcode);
        // Try to find item by barcode and add to cart
        handleBarcodeScanned(barcode);
    };

    window.onScanError = function(error) {
        console.error('Scan error:', error);
    };

    window.onScanCancel = function() {
        console.log('Scan cancelled');
    };

    window.onScanTimeout = function() {
        console.log('Scan timeout');
    };

    // Handle barcode scanned - search and add item
    function handleBarcodeScanned(barcode) {
        if (!barcode) return;

        // Search for item by barcode (item_code or barcode field)
        let foundItem = items.find(item =>
            item.value === barcode ||
            item.barcode === barcode ||
            item.label.toLowerCase().includes(barcode.toLowerCase())
        );

        if (foundItem) {
            // Add item to cart with qty 1
            addItemToCart(foundItem.value, 1);
            if (isAndroidPOSApp() && Android.beep) {
                Android.beep(100); // Success beep
            }
        } else {
            showStyledError('تنبيه', 'لم يتم العثور على الصنف: ' + barcode);
            if (isAndroidPOSApp() && Android.beep) {
                Android.beep(300); // Error beep
            }
        }
    }

    // Helper function to add item to cart (will be linked to main cart logic)
    function addItemToCart(item_code, qty) {
        // This will trigger the item addition in the main cart
        // The actual implementation depends on how items are added in the UI
        if (item_catalog_dialog && item_catalog_dialog.is_visible) {
            // If catalog is open, simulate click on item
            const itemCard = document.querySelector(`[data-item-code="${item_code}"]`);
            if (itemCard) itemCard.click();
        } else {
            // Direct add to cart
            const item = item_lookup[item_code];
            if (item) {
                // Trigger item add modal or direct add
                window.dispatchEvent(new CustomEvent('pos-add-item', {
                    detail: { item_code, qty, item }
                }));
            }
        }
    }

    // Print receipt function with Android native support
    function printPOSReceipt(invoice_name, customer_name, items, total, discount, grand_total, paid_amount, payment_mode, custom_hash, is_return, customer_balance) {
        let now = new Date();
        let dateStr = now.toLocaleDateString('ar-EG');
        let timeStr = now.toLocaleTimeString('ar-EG');

        // Check if return invoice based on invoice name or is_return flag
        let isReturnInvoice = is_return || (invoice_name && invoice_name.includes('RET'));

        // Customer balance after this invoice (positive = owes money, negative = credit)
        let balanceAfterInvoice = (customer_balance || 0);

        // ===== ANDROID NATIVE PRINTING =====
        if (isAndroidPrinterAvailable()) {
            try {
                // Prepare receipt data for Android native printer
                const receiptData = {
                    invoice_name: invoice_name,
                    customer_name: customer_name,
                    pos_profile: profile.full_name || profile.name || '',
                    items: items.map(item => ({
                        item_code: item.item_code || '',
                        item_name: item.item_name || item.item_code || '',
                        qty: item.qty,
                        rate: item.rate
                    })),
                    total: total,
                    discount: discount,
                    grand_total: grand_total,
                    paid_amount: paid_amount,
                    payment_mode: payment_mode || '',
                    custom_hash: custom_hash || '',
                    is_return: isReturnInvoice,
                    customer_balance: balanceAfterInvoice,
                    company_name: company_print_name || 'Elnoor-النور',
                    company_phone: company_phone || '',
                    date: dateStr,
                    time: timeStr
                };

                // Call Android native print function
                Android.printReceipt(JSON.stringify(receiptData));
                console.log('Sent receipt to Android printer');
                return; // Exit - native print handles the rest
            } catch (e) {
                console.error('Android print error, falling back to browser print:', e);
                // Fall through to browser print if Android print fails
            }
        }

        // ===== BROWSER PRINTING (Fallback) =====
        let html = `<!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="utf-8">
            <style>
                @media print {
                    @page {
                        size: 80mm auto;
                        margin: 2mm;
                    }
                    body { margin: 0; }
                }
                body {
                    font-family: 'Courier New', monospace;
                    direction: rtl;
                    width: 80mm;
                    margin: 0 auto;
                    padding: 5mm;
                    font-size: 12px;
                }
                .center { text-align: center; }
                .bold { font-weight: bold; }
                .header {
                    border-bottom: 2px dashed #000;
                    padding-bottom: 5px;
                    margin-bottom: 10px;
                }
                .invoice-info {
                    margin-bottom: 10px;
                    font-size: 11px;
                }
                .items {
                    border-top: 1px dashed #000;
                    border-bottom: 1px dashed #000;
                    padding: 5px 0;
                    margin: 10px 0;
                }
                .item-row {
                    display: flex;
                    justify-content: space-between;
                    margin: 3px 0;
                    font-size: 11px;
                }
                .totals {
                    margin-top: 10px;
                    font-size: 12px;
                }
                .total-row {
                    display: flex;
                    justify-content: space-between;
                    margin: 3px 0;
                }
                .grand-total {
                    border-top: 2px solid #000;
                    padding-top: 5px;
                    font-weight: bold;
                    font-size: 14px;
                }
                .customer-balance {
                    border-top: 2px dashed #000;
                    margin-top: 10px;
                    padding-top: 8px;
                    font-weight: bold;
                    font-size: 13px;
                    background: #f3f4f6;
                    padding: 8px;
                    border-radius: 4px;
                }
                .footer {
                    text-align: center;
                    margin-top: 15px;
                    font-size: 10px;
                    border-top: 1px dashed #000;
                    padding-top: 10px;
                }
                .return-badge {
                    background: #dc2626;
                    color: white;
                    padding: 3px 8px;
                    border-radius: 4px;
                    font-size: 11px;
                    display: inline-block;
                    margin-top: 5px;
                }
                .invoice-number {
                    font-size: 14px;
                    font-weight: bold;
                    margin-top: 5px;
                    padding: 5px;
                    background: #f3f4f6;
                    border-radius: 4px;
                }
            </style>
        </head>
        <body>
            <div class="header center">
                <div class="bold" style="font-size: 16px;">${isReturnInvoice ? 'فاتورة مرتجع' : 'فاتورة بيع'}</div>
                <div class="invoice-number">${escape_html(invoice_name)}</div>
                ${isReturnInvoice ? '<div class="return-badge">مرتجع</div>' : ''}
            </div>

            <div class="invoice-info">
                <div>العميل: ${escape_html(customer_name)}</div>
                <div>التاريخ: ${dateStr}</div>
                <div>الوقت: ${timeStr}</div>
                ${custom_hash ? `<div>رقم القيد: ${escape_html(custom_hash)}</div>` : ''}
            </div>

            <div class="items">
                <div class="item-row bold">
                    <span>الصنف</span>
                    <span>الكمية × السعر = المجموع</span>
                </div>
                ${items.map(item => `
                    <div class="item-row">
                        <span>${escape_html(item.item_name || item.item_code)}</span>
                        <span>${item.qty} × ${format_currency_text(item.rate)} = ${format_currency_text(item.qty * item.rate)}</span>
                    </div>
                `).join('')}
            </div>

            <div class="totals">
                <div class="total-row">
                    <span>المجموع:</span>
                    <span>${format_currency_text(total)}</span>
                </div>
                ${discount > 0 ? `
                <div class="total-row">
                    <span>الخصم:</span>
                    <span>-${format_currency_text(discount)}</span>
                </div>
                ` : ''}
                <div class="total-row grand-total">
                    <span>الإجمالي:</span>
                    <span>${format_currency_text(grand_total)}</span>
                </div>
                ${paid_amount > 0 ? `
                <div class="total-row" style="margin-top: 5px;">
                    <span>${isReturnInvoice ? 'المسترجع' : 'المدفوع'} (${escape_html(payment_mode || '')}):</span>
                    <span>${format_currency_text(paid_amount)}</span>
                </div>
                ${!isReturnInvoice ? `
                ${paid_amount > grand_total ? `
                <div class="total-row">
                    <span>الزيادة (تضاف للرصيد):</span>
                    <span style="color: #16a34a;">${format_currency_text(paid_amount - grand_total)}</span>
                </div>
                ` : paid_amount < grand_total ? `
                <div class="total-row">
                    <span>المتبقي:</span>
                    <span>${format_currency_text(grand_total - paid_amount)}</span>
                </div>
                ` : ''}
                ` : ''}
                ` : ''}
            </div>

            <div class="customer-balance">
                <div class="total-row">
                    <span>رصيد العميل بعد الفاتورة:</span>
                    <span style="color: ${balanceAfterInvoice > 0 ? '#dc2626' : '#16a34a'};">${format_currency_text(balanceAfterInvoice)}</span>
                </div>
            </div>

            <div class="footer">
                <div>شكراً لتعاملكم معنا</div>
                <div style="margin-top: 5px;">تمت الطباعة: ${dateStr} ${timeStr}</div>
            </div>

            <script>
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 100);
                    }, 250);
                };
            </script>
        </body>
        </html>`;

        let win = window.open('', '_blank', 'width=320,height=600');
        win.document.write(html);
        win.document.close();
    }

    // ==================== Scanner Button for Android ====================
    // Add scan button to UI if running in Android POS app
    function initAndroidPOSFeatures() {
        if (!isAndroidPOSApp()) return;

        console.log('Android POS app detected, initializing features...');

        // Add floating scan button
        const scanBtn = document.createElement('button');
        scanBtn.id = 'android-scan-btn';
        scanBtn.innerHTML = '<i class="fa fa-barcode"></i>';
        scanBtn.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 20px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: #2563eb;
            color: white;
            border: none;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
            font-size: 24px;
            cursor: pointer;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        scanBtn.onclick = function() {
            if (Android.startScan) {
                Android.startScan();
                frappe.show_alert({ message: 'جاري المسح...', indicator: 'blue' }, 2);
            }
        };
        document.body.appendChild(scanBtn);

        // Show Android POS indicator
        frappe.show_alert({
            message: 'تم الاتصال بجهاز نقاط البيع',
            indicator: 'green'
        }, 3);
    }

    // Initialize Android features when bridge is ready
    if (typeof Android !== 'undefined') {
        initAndroidPOSFeatures();
    } else {
        window.addEventListener('androidBridgeReady', initAndroidPOSFeatures);
    }

    // --- Data fetching ---
    let [customers_res, items_res] = await Promise.all([
        frappe.call({ method: "mobile_pos.mobile_pos.page.mini_pos.api.mini_pos_get_customers" }),
        frappe.call({ method: "mobile_pos.mobile_pos.page.mini_pos.api.mini_pos_get_items" })
    ]);
    let customers = (customers_res.message || []).map(c => ({ value: c.name, label: c.customer_name || c.name }));
    let items = items_res.message || [];
    let item_lookup = {};
    let item_groups = [];
    items = items.map(i => ({
        value: i.name,
        label: i.item_name || i.name,
        stock_uom: i.stock_uom,
        image: i.image,
        description: i.description,
        standard_rate: i.standard_rate,
        item_group: i.item_group || "",
        available_qty: null
    }));
    items.forEach(item => { item_lookup[item.value] = item; });
    item_groups = Array.from(new Set(items.map(i => i.item_group).filter(Boolean))).sort();

    let profile, modes = [], allow_edit_price = 0, allow_add_customer = 1, warehouse = "";
    let sales_taxes_template = null;
    let taxes_table = [];
    let mode_options = [];
    let allow_negative_stock = false;
    let company_print_name = "";
    let company_phone = "";

    try {
        let profileRes = await frappe.call({
            method: "mobile_pos.mobile_pos.page.mini_pos.api.mini_pos_get_profile"
        });
        profile = (profileRes && profileRes.message) || profileRes || {};
        allow_edit_price = toInt(profile.allow_to_edit_item_price);
        allow_add_customer = toInt(profile.allow_to_add_customer);
        warehouse = profile.warehouse || "";
        allow_negative_stock = profile.allow_negative_stock || false;
        company_print_name = profile.company_print_name || "Elnoor-النور";
        company_phone = profile.company_phone || "";
        modes = (profile.mini_pos_mode_of_payment || []).map(r => r.mode_of_payment).filter(Boolean);
        modes = Array.from(new Set(modes));
        mode_options = modes.map(m => ({ value: m, label: m }));

        sales_taxes_template = profile.sales_taxes || null;
        taxes_table = [];
        if (sales_taxes_template) {
            let template_doc = await frappe.call({
                method: "frappe.client.get",
                args: { doctype: "Sales Taxes and Charges Template", name: sales_taxes_template }
            });
            let template_taxes = template_doc.message.taxes || [];
            taxes_table = template_taxes.map(row => ({
                charge_type: row.charge_type,
                account_head: row.account_head,
                rate: row.rate,
                description: row.description,
                row_id: row.name
            }));
        }
    } catch (e) {
        showStyledError(TEXT.NO_PROFILE_TITLE, TEXT.NO_PROFILE_MSG);
        return;
    }

    try {
        if (items.length && warehouse) {
            let stockRes = await frappe.call({
                method: "mobile_pos.mobile_pos.page.mini_pos.api.mini_pos_get_stock_availability",
                args: { items: JSON.stringify(items.map(i => i.value)) }
            });
            let stockMap = (stockRes && stockRes.message) || {};
            items.forEach(item => {
                if (Object.prototype.hasOwnProperty.call(stockMap, item.value)) {
                    item.available_qty = stockMap[item.value];
                    item_lookup[item.value].available_qty = stockMap[item.value];
                } else {
                    item.available_qty = 0;
                    item_lookup[item.value].available_qty = 0;
                }
            });
        }
    } catch (err) {
        console.warn("Mini POS: Could not fetch item availability", err);
    }

    let pos_items = [], last_invoice = null, last_invoice_data = null, return_mode = false;
    let discount_amount = 0;
    let paid_amount = 0;
    let paid_amount_manual = false;
    let item_detail_cache = {};
    let item_catalog_dialog = null;
    let item_catalog_grid = null;
    let item_catalog_search = null;
    let item_catalog_available_btn = null;
    let item_catalog_group_container = null;
    let selected_mode_value = "";
    let item_catalog_show_available_only = false;
    let item_catalog_group_filter = "__all";
    const storageSafe = (() => {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const testKey = '__mini_pos_test__';
                window.localStorage.setItem(testKey, '1');
                window.localStorage.removeItem(testKey);
                return window.localStorage;
            }
        } catch (err) {
            console.warn('Mini POS: localStorage unavailable', err);
        }
        return null;
    })();
    const MODE_STORAGE_KEY = 'mini_pos_default_mode';
    function getSavedMode() {
        return storageSafe ? storageSafe.getItem(MODE_STORAGE_KEY) : null;
    }
    function saveMode(val) {
        if (storageSafe) {
            let valueToStore = typeof val === 'string' ? val : (val || '');
            storageSafe.setItem(MODE_STORAGE_KEY, valueToStore);
        }
    }
    function resolveDefaultMode() {
        let saved = getSavedMode();
        if (saved !== null) {
            if (saved === '' || modes.includes(saved)) return saved;
        }
        return modes.length ? modes[0] : '';
    }

    function findValue(arr, label) {
        let o = arr.find(x => x.label === label);
        return o ? o.value : null;
    }
    function update_top_action_btns() {
        let customer_label = $('#mini-pos-customer').val();
        let customer = findValue(customers, customer_label);
        $('#mini-pos-return-btn, #mini-pos-ledger-btn, #mini-pos-payment-btn, #mini-pos-cancel-invoice-btn, #mini-pos-invoice-history-btn, #mini-pos-discount-btn').prop('disabled', !customer);
    }
    function showMsg(msg, type) {
        if (type === "error") {
            // Use styled popup for errors
            showStyledError('تنبيه', msg);
        } else {
            // Keep inline display for success messages
            $('#mini-pos-result').html(`<div class="mini-pos-${type}">${msg}</div>`);
            if(type==="success") setTimeout(()=>$('#mini-pos-result').empty(), 2500);
        }
    }

    function calculate_tax_and_grand_total(items) {
        let total = items.reduce((sum, item) => sum + (item.qty * item.rate), 0);
        let discount = Math.max(0, Math.min(discount_amount || 0, total));
        let grand_total = total - discount;
        return {total, tax_amount: 0, discount, grand_total};
    }


    const normalizeString = val => String(val || '').trim().toLowerCase();

    // Convert Arabic numerals (٠-٩) to English numerals (0-9) and handle Arabic decimal/thousands separators
    function convertArabicToEnglishNumbers(str) {
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
    }

    function findModeOptionByValue(value) {
        let target = normalizeString(value);
        return mode_options.find(opt => normalizeString(opt.value) === target);
    }
    function findModeOptionByLabel(label) {
        let target = normalizeString(label);
        return mode_options.find(opt => normalizeString(opt.label) === target);
    }
    function renderModeButtons() {
        let $button = $('#mini-pos-mode-text');
        if (!$button.length) return;
        let selectedOption = findModeOptionByValue(selected_mode_value);
        let displayText = selectedOption ? selectedOption.label : 'وسيلة الدفع';
        $button.text(displayText);
    }
    function openModeSelectionDialog() {
        if (!mode_options || mode_options.length === 0) {
            showStyledError('تنبيه', TEXT.NO_PAYMENT_MODES || 'لا توجد وسائل دفع متاحة');
            return;
        }

        let d = new frappe.ui.Dialog({
            title: 'اختر وسيلة الدفع',
            fields: [
                {
                    fieldname: 'payment_modes',
                    fieldtype: 'HTML'
                }
            ],
            primary_action_label: 'إغلاق',
            primary_action: function() {
                d.hide();
            }
        });

        let html = '<div style="display:flex;flex-direction:column;gap:10px;padding:10px;">';
        mode_options.forEach(opt => {
            let isActive = opt.value === selected_mode_value;
            html += `
                <button type="button"
                    class="btn ${isActive ? 'btn-primary' : 'btn-default'}"
                    data-mode-value="${escape_html(opt.value)}"
                    style="padding:14px 20px;font-size:1.1em;font-weight:${isActive ? '700' : '600'};border-radius:8px;text-align:center;${isActive ? 'background:#f59e42;color:#fff;border-color:#f59e42;' : ''}">
                    ${isActive ? '<i class="fa fa-check" style="margin-left:8px;"></i>' : ''}
                    ${escape_html(opt.label)}
                </button>
            `;
        });
        html += '</div>';

        d.fields_dict.payment_modes.$wrapper.html(html);

        d.fields_dict.payment_modes.$wrapper.on('click', 'button[data-mode-value]', function() {
            let value = $(this).attr('data-mode-value') || '';
            setModeSelection(value, { syncStorage: true });
            d.hide();
        });

        d.show();
    }
    function setModeSelection(value, {syncStorage = false, render = true} = {}) {
        let option = findModeOptionByValue(value);
        if (!option && mode_options.length) option = mode_options[0];
        selected_mode_value = option ? option.value : '';
        if (syncStorage) saveMode(selected_mode_value);
        if (render) renderModeButtons();
        return selected_mode_value;
    }
    function ensureModeSelectionValid({syncStorage = false} = {}) {
        let option = findModeOptionByValue(selected_mode_value);
        if (!option) {
            let stored = getSavedMode();
            if (stored !== null && (stored === '' || modes.includes(stored))) selected_mode_value = stored;
            else selected_mode_value = resolveDefaultMode();
        }
        return setModeSelection(selected_mode_value, { syncStorage });
    }

    function createSmartSelector({ inputSelector, containerSelector, data = [], maxResults = 10, emptyText = TEXT.NO_MATCHES, onSelect = null }) {
        let $input = $(wrapper).find(inputSelector);
        if (!$input.length) return { setData: () => {}, refresh: () => {} };
        let $container = containerSelector ? $(wrapper).find(containerSelector) : null;
        if (!$container || !$container.length) {
            $container = $('<div class="mini-pos-suggestions"></div>');
            $container.insertAfter($input);
        }
        $container.attr('role', 'listbox');

        let listData = Array.isArray(data) ? data.slice() : [];
        let filtered = [];
        let activeIndex = -1;
        let isVisible = false;
        let triggeredFromSelect = false;

        const escapeRegExp = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const show = () => {
            if (!isVisible) {
                $container.stop(true, true).fadeIn(80);
                isVisible = true;
            }
        };
        const hide = () => {
            if (isVisible) {
                $container.stop(true, true).fadeOut(80);
                isVisible = false;
            }
            activeIndex = -1;
        };
        const highlight = (text, query) => {
            let safe = escape_html(text || '');
            if (!query) return safe;
            try {
                let regex = new RegExp(`(${escapeRegExp(query)})`, 'ig');
                return safe.replace(regex, '<span class="mini-pos-suggestion-highlight">$1</span>');
            } catch(e) {
                return safe;
            }
        };
        const ensureActiveVisible = () => {
            if (activeIndex < 0) return;
            let $active = $container.children('.mini-pos-suggestion-option').eq(activeIndex);
            if ($active.length) {
                let optionTop = $active.position().top;
                let optionBottom = optionTop + $active.outerHeight();
                let containerScroll = $container.scrollTop();
                let containerHeight = $container.innerHeight();
                if (optionBottom > containerHeight) {
                    $container.scrollTop(containerScroll + optionBottom - containerHeight);
                } else if (optionTop < 0) {
                    $container.scrollTop(containerScroll + optionTop);
                }
            }
        };
        const render = (query) => {
            if (!filtered.length) {
                $container.html(`<div class="mini-pos-suggestions-empty">${escape_html(emptyText)}</div>`);
                return;
            }
            let html = filtered.map((item, idx) => {
                let secondary = (item.value && item.value !== item.label)
                    ? `<div class="mini-pos-suggestion-secondary">${highlight(item.value, query)}</div>`
                    : '';
                return `
                    <div class="mini-pos-suggestion-option${idx === activeIndex ? ' active' : ''}" data-value="${escape_html(item.value || '')}" data-label="${escape_html(item.label || '')}" role="option" aria-selected="${idx === activeIndex}">
                        <div class="mini-pos-suggestion-primary">${highlight(item.label, query)}</div>
                        ${secondary}
                    </div>`;
            }).join('');
            $container.html(html);
        };
        const filterList = (term, options = {}) => {
            let query = (term || '').trim();
            let normalized = query.toLowerCase();
            filtered = normalized
                ? listData.filter(item => {
                    let label = (item.label || '').toLowerCase();
                    let value = (item.value || '').toLowerCase();
                    return label.includes(normalized) || value.includes(normalized);
                })
                : listData.slice();
            filtered = filtered.slice(0, maxResults);
            activeIndex = filtered.length ? 0 : -1;
            render(query);
            if (activeIndex >= 0) ensureActiveVisible();
            if (options.silent) return;
            if (filtered.length || normalized) {
                show();
            } else {
                hide();
            }
        };
        const selectIndex = (index) => {
            if (index < 0 || index >= filtered.length) return;
            let item = filtered[index];
            triggeredFromSelect = true;
            $input.val(item.label);
            $input.data('selectedValue', item.value);
            if (typeof onSelect === 'function') onSelect(item);
            hide();
            $input.trigger('input');
        };

        $input.on('focus', () => {
            filterList($input.val());
        });
        $input.on('input', () => {
            if (triggeredFromSelect) {
                triggeredFromSelect = false;
                return;
            }
            $input.data('selectedValue', '');
            filterList($input.val());
        });
        $input.on('keydown', (e) => {
            if (!filtered.length) return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeIndex = activeIndex < filtered.length - 1 ? activeIndex + 1 : 0;
                render(($input.val() || '').trim());
                ensureActiveVisible();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeIndex = activeIndex > 0 ? activeIndex - 1 : filtered.length - 1;
                render(($input.val() || '').trim());
                ensureActiveVisible();
            } else if (e.key === 'Enter') {
                if (activeIndex >= 0) {
                    e.preventDefault();
                    selectIndex(activeIndex);
                }
            } else if (e.key === 'Escape') {
                hide();
            }
        });
        $input.on('blur', () => {
            setTimeout(() => hide(), 120);
        });
        $container.on('mousedown', '.mini-pos-suggestion-option', function(e) {
            e.preventDefault();
            let idx = $(this).index();
            selectIndex(idx);
        });

        const docEventNs = `.miniPosSelector-${$input.attr('id') || Math.random().toString(36).slice(2)}`;
        $(document).off(`mousedown${docEventNs}`).on(`mousedown${docEventNs}`, (e) => {
            if (!$.contains(wrapper, e.target)) return;
            if ($input.is(e.target) || $.contains($container[0], e.target)) return;
            hide();
        });

        filterList('', { silent: true });

        return {
            setData(newData = []) {
                listData = Array.isArray(newData) ? newData.slice() : [];
                filterList($input.val(), { silent: !$input.is(':focus') });
            },
            refresh(options = {}) {
                filterList($input.val(), options);
            }
        };
    }

    function renderItems(qty_editable) {
        let rows = pos_items.map((item, i) => `
            <tr>
                <td style="text-align:center;">${i + 1}</td>
                <td style="text-align:right;">
                    <div class="mini-pos-item-name">${escape_html(item.item_name)}</div>
                    <div class="mini-pos-item-meta">${escape_html(item.item_code)}${item.uom ? ' · ' + escape_html(item.uom) : ''}</div>
                </td>
                <td style="text-align:center;">${escape_html(item.uom || "-")}</td>
                <td style="text-align:center;">${
                    qty_editable
                        ? `<input type="number" inputmode="decimal" class="mini-pos-row-qty" data-idx="${i}" value="${item.qty}" min="1" style="width:60px; height:32px; border-radius:16px; border:1.5px solid #dbeafe; text-align:center; background: #f9fafb;">`
                        : escape_html(format_float_text(item.qty))
                }</td>
                <td style="text-align:center;">${format_number(item.rate)}</td>
                <td style="text-align:center;">${
                    qty_editable ? '' : `<button class="btn btn-danger btn-sm mini-pos-remove" data-idx="${i}" title="${TEXT.REMOVE}" style="padding: 2px 7px;"><i class="fa fa-trash"></i></button>`
                }</td>
            </tr>
        `).join('');
        const tableBody = document.getElementById('mini-pos-items');
        tableBody.innerHTML = rows || `<tr><td colspan="6" class="text-center text-muted" style="font-size:0.97em;">${TEXT.NO_ITEMS}</td></tr>`;
        renderTotal();
        updateNewBtn();
    }

    function renderTotal() {
        let calc = calculate_tax_and_grand_total(pos_items);
        if (!paid_amount_manual && !return_mode) {
            let normalizedGrand = Number(calc.grand_total || 0);
            if (!Number.isFinite(normalizedGrand) || normalizedGrand < 0) normalizedGrand = 0;
            paid_amount = normalizedGrand;
            let $paidInput = $('#mini-pos-paid');
            if ($paidInput.length) {
                $paidInput.val(normalizedGrand.toFixed(2));
            }
        }
        discount_amount = calc.discount;
        let discountVal = Math.max(0, Number(calc.discount || 0));
        let paidVal = Math.max(0, parseFloat(paid_amount) || 0);
        let discountDisabled = return_mode ? 'disabled="disabled"' : '';
        let paidDisabled = ''; // Allow editing paid/returned amount in both modes
        let activeId = document.activeElement ? document.activeElement.id : null;
        let existingDiscountVal = $('#mini-pos-discount').length ? $('#mini-pos-discount').val() : null;
        let existingPaidVal = $('#mini-pos-paid').length ? $('#mini-pos-paid').val() : null;
        let discountInputValue = (activeId === 'mini-pos-discount' && existingDiscountVal !== null) ? existingDiscountVal : discountVal.toFixed(2);
        let paidInputValue = (activeId === 'mini-pos-paid' && existingPaidVal !== null) ? existingPaidVal : paidVal.toFixed(2);
        let totalsHtml = `
            <div class="mini-pos-total-wrap">
                <div class="mini-pos-total-row">
                    <span class="mini-pos-total-pill total">
                        <span>${TEXT.TOTAL}</span>
                        <span>${format_number(calc.total)}</span>
                    </span>
                    <label class="mini-pos-total-field" for="mini-pos-discount">
                        <span class="mini-pos-total-field-label">${TEXT.DISCOUNT}</span>
                        <input id="mini-pos-discount" type="text" inputmode="decimal" value="${discountInputValue}" ${discountDisabled}>
                    </label>
                </div>
                <div class="mini-pos-total-row">
                    <span class="mini-pos-total-pill grand">
                        <span>${TEXT.GRAND_TOTAL}</span>
                        <span>${format_number(calc.grand_total)}</span>
                    </span>
                    ${return_mode ? '' : `<label class="mini-pos-total-field" for="mini-pos-paid">
                        <span class="mini-pos-total-field-label">${TEXT.PAID_AMOUNT}</span>
                        <input id="mini-pos-paid" type="text" inputmode="decimal" value="${paidInputValue}" ${paidDisabled}>
                    </label>`}
                </div>
            </div>
        `;
        $('#mini-pos-total').html(totalsHtml);
        if (activeId && (activeId === 'mini-pos-discount' || activeId === 'mini-pos-paid')) {
            let el = document.getElementById(activeId);
            if (el && !el.disabled) {
                el.focus();
            }
        }
    }
    function renderItemCatalog(term) {
        if (!item_catalog_grid) return;
        let normalized = normalizeString(term);
        let filtered = normalized
            ? items.filter(it => normalizeString(it.label).includes(normalized) || normalizeString(it.value).includes(normalized))
            : items.slice();
        if (item_catalog_group_filter !== "__all") {
            filtered = filtered.filter(it => (it.item_group || "") === item_catalog_group_filter);
        }
        if (item_catalog_show_available_only) {
            filtered = filtered.filter(it => typeof it.available_qty === "number" && it.available_qty > 0);
        }
        if (!filtered.length) {
            item_catalog_grid.html(`<div class="mini-pos-catalog-empty"><i class="fa fa-inbox" style="font-size:3em;opacity:0.3;margin-bottom:12px;"></i><div>${escape_html(TEXT.NO_ITEMS_MATCH)}</div></div>`);
            return;
        }
        let html = filtered.map(item => {
            let rate_value = parseFloat(item.standard_rate || 0) || 0;
            let rate_text = rate_value ? format_currency_text(rate_value) : TEXT.NO_PRICE;
            let qty = (typeof item.available_qty === 'number') ? item.available_qty : null;
            let formatted_qty = qty !== null ? format_float_text(qty) : null;
            let in_stock = qty !== null && qty > 0;
            let stock_icon = "";
            let stock_text = "";
            let card_class = "mini-pos-catalog-card";

            // If allow_negative_stock is enabled, treat all items as available
            let is_available = allow_negative_stock || in_stock || qty === null;

            if (allow_negative_stock) {
                // When negative stock allowed, show all items as available
                stock_icon = "fa-check-circle";
                stock_text = qty !== null ? formatted_qty : "0";
                card_class += " in-stock";
            } else if (qty === null) {
                stock_icon = "fa-question-circle";
                stock_text = TEXT.AVAILABILITY_UNKNOWN;
                card_class += " neutral";
            } else if (in_stock) {
                stock_icon = "fa-check-circle";
                stock_text = formatted_qty;
                card_class += " in-stock";
            } else {
                stock_icon = "fa-times-circle";
                stock_text = TEXT.OUT_OF_STOCK;
                card_class += " out-stock disabled";
            }

            let tabIndex = is_available ? "0" : "-1";
            return `
                <div class="${card_class}" data-item="${escape_html(item.value)}" tabindex="${tabIndex}">
                    <div class="mini-pos-card-header">
                        <div class="mini-pos-catalog-icon">
                            <i class="fa fa-cube"></i>
                        </div>
                        <div class="mini-pos-stock-badge">
                            <i class="fa ${stock_icon}"></i>
                        </div>
                    </div>
                    <div class="mini-pos-catalog-name">${escape_html(item.label)}</div>
                    <div class="mini-pos-catalog-code">${escape_html(item.value)}</div>
                    <div class="mini-pos-catalog-footer">
                        <div class="mini-pos-catalog-price">
                            <i class="fa fa-tag"></i>
                            <span>${escape_html(rate_text)}</span>
                        </div>
                        <div class="mini-pos-catalog-qty">
                            <span>${escape_html(stock_text)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        item_catalog_grid.html(html);
    }

    function renderGroupButtons() {
        if (!item_catalog_group_container) return;
        let buttons = [
            `<button type="button" class="mini-pos-group-btn${item_catalog_group_filter === "__all" ? " active" : ""}" data-group="__all">${escape_html(TEXT.FILTER_ALL_GROUPS)}</button>`
        ];
        if (item_groups.length) {
            buttons = buttons.concat(item_groups.map(group => `
                <button type="button" class="mini-pos-group-btn${item_catalog_group_filter === group ? " active" : ""}" data-group="${escape_html(group)}">${escape_html(group)}</button>
            `));
        }
        item_catalog_group_container.html(buttons.join(''));
    }

    function ensureItemCatalogDialog() {
        if (item_catalog_dialog) {
            if (item_catalog_available_btn) {
                item_catalog_available_btn.toggleClass('active', item_catalog_show_available_only);
            }
            renderGroupButtons();
            return item_catalog_dialog;
        }
        item_catalog_dialog = new frappe.ui.Dialog({
            title: TEXT.BROWSE_ITEMS,
            size: "large",
            primary_action_label: TEXT.CLOSE,
            primary_action: () => item_catalog_dialog.hide(),
            fields: [
                { fieldtype: "HTML", fieldname: "catalog_html" }
            ]
        });
        let $body = $(item_catalog_dialog.fields_dict.catalog_html.wrapper);
        $body.addClass('mini-pos-item-catalog');
        $body.html(`
            <div class="mini-pos-catalog-toolbar">
                <button type="button" id="mini-pos-filter-available" class="mini-pos-filter-btn">
                    <i class="fa fa-check-circle"></i> ${escape_html(TEXT.FILTER_AVAILABLE_ONLY)}
                </button>
                <div class="mini-pos-group-buttons" id="mini-pos-group-buttons"></div>
            </div>
            <div class="mini-pos-catalog-search">
                <input type="search" id="mini-pos-catalog-search" autocomplete="off" placeholder="${escape_html(TEXT.SEARCH_ITEMS)}">
            </div>
            <div class="mini-pos-catalog-grid" id="mini-pos-catalog-grid"></div>
        `);
        item_catalog_grid = $body.find('#mini-pos-catalog-grid');
        item_catalog_search = $body.find('#mini-pos-catalog-search');
        item_catalog_search.on('input', frappe.utils.debounce(() => {
            renderItemCatalog(item_catalog_search.val());
        }, 160));
        item_catalog_available_btn = $body.find('#mini-pos-filter-available');
        item_catalog_available_btn.on('click', function() {
            item_catalog_show_available_only = !item_catalog_show_available_only;
            $(this).toggleClass('active', item_catalog_show_available_only);
            renderItemCatalog(item_catalog_search ? item_catalog_search.val() : '');
        });
        item_catalog_group_container = $body.find('#mini-pos-group-buttons');
        const handleGroupClick = function() {
            let group = $(this).data('group') || "__all";
            if (item_catalog_group_filter === group) return;
            item_catalog_group_filter = group;
            renderGroupButtons();
            renderItemCatalog(item_catalog_search ? item_catalog_search.val() : '');
        };
        item_catalog_group_container.on('click', '.mini-pos-group-btn', handleGroupClick);
        renderGroupButtons();
        if (item_catalog_show_available_only) item_catalog_available_btn.addClass('active');
        else item_catalog_available_btn.removeClass('active');
        item_catalog_grid.on('click', '.mini-pos-catalog-card', function() {
            // Allow click if allow_negative_stock is enabled or item is not disabled
            if ($(this).hasClass('disabled') && !allow_negative_stock) return;
            let code = $(this).data('item');
            let base = item_lookup[code];
            if (base) openItemConfigDialog(base);
        });
        item_catalog_grid.on('keyup', '.mini-pos-catalog-card', function(e) {
            // Allow keypress if allow_negative_stock is enabled or item is not disabled
            if (e.key === 'Enter' && (!$(this).hasClass('disabled') || allow_negative_stock)) {
                let code = $(this).data('item');
                let base = item_lookup[code];
                if (base) openItemConfigDialog(base);
            }
        });
        return item_catalog_dialog;
    }

    async function getItemDetail(item_code) {
        let customer_label = $('#mini-pos-customer').val();
        let customer = findValue(customers, customer_label) || "";
        let cache_key = item_code + "||" + customer;
        if (item_detail_cache[cache_key]) return item_detail_cache[cache_key];
        try {
            if (frappe.dom && frappe.dom.freeze) frappe.dom.freeze(TEXT.LOADING_ITEM);
            let args = { item_code };
            if (customer) args.customer = customer;
            let res = await frappe.call({
                method: "mobile_pos.mobile_pos.page.mini_pos.api.mini_pos_get_item_details",
                args: args
            });
            let detail = (res && res.message) || res;
            if (detail) {
                detail.uoms = Array.isArray(detail.uoms) ? detail.uoms : [];
                if (typeof detail.actual_qty === "number" && item_lookup[item_code]) {
                    item_lookup[item_code].available_qty = detail.actual_qty;
                    if (item_catalog_grid) {
                        renderItemCatalog(item_catalog_search ? item_catalog_search.val() : '');
                    }
                }
                item_detail_cache[cache_key] = detail;
                return detail;
            }
        } catch (err) {
            showMsg(err.message || TEXT.LOAD_ITEM_ERROR, "error");
        } finally {
            if (frappe.dom && frappe.dom.unfreeze) frappe.dom.unfreeze();
        }
        return null;
    }

    async function openItemConfigDialog(item) {
        if (!item) return;
        let detail = await getItemDetail(item.value);
        if (!detail) return;
        let uomRows = (detail.uoms && detail.uoms.length) ? detail.uoms.slice() : [];
        if (!uomRows.length) {
            uomRows.push({
                uom: detail.stock_uom || item.stock_uom || TEXT.DEFAULT_UOM,
                conversion_factor: 1
            });
        }
        let defaultUom = detail.default_uom || item.stock_uom || (uomRows[0] && uomRows[0].uom) || "";
        let baseRate = parseFloat(detail.base_rate || detail.rate || detail.price_list_rate || detail.standard_rate || item.standard_rate || 0) || 0;
        let defaultUomRow = uomRows.find(u => u.uom === defaultUom);
        let defaultConversion = parseFloat(defaultUomRow && defaultUomRow.conversion_factor) || 1;
        // Use UOM-specific rate if available, otherwise calculate from base rate
        let initialRate = (defaultUomRow && defaultUomRow.rate !== undefined)
            ? parseFloat(defaultUomRow.rate)
            : (baseRate ? baseRate * defaultConversion : parseFloat(detail.rate || detail.standard_rate || item.standard_rate || 0) || 0);
        if (!baseRate && initialRate) {
            baseRate = initialRate / (defaultConversion || 1);
        }
        if (baseRate) {
            item.standard_rate = baseRate;
            if (item_lookup[item.value]) {
                item_lookup[item.value].standard_rate = baseRate;
            }
            if (item_catalog_grid) {
                renderItemCatalog(item_catalog_search ? item_catalog_search.val() : '');
            }
        }

        let selectedUom = defaultUom;
        if (!uomRows.some(u => u.uom === selectedUom)) {
            selectedUom = (uomRows[0] && uomRows[0].uom) || "";
        }

        let dialog = new frappe.ui.Dialog({
            title: `<i class="fa fa-plus-circle" style="margin-left: 8px;"></i> ${TEXT.ADD_ITEM(item.label)}`,
            primary_action_label: `<i class="fa fa-cart-plus"></i> ${TEXT.ADD}`,
            fields: [
                { fieldtype: "HTML", fieldname: "item_preview" },
                { fieldtype: "HTML", fieldname: "uom_buttons" },
                { fieldtype: "HTML", fieldname: "qty_section" },
                { fieldtype: "HTML", fieldname: "rate_section" }
            ],
            primary_action() {
                let qty = parseFloat(dialog.$wrapper.find('#item-qty-input').val()) || 0;
                let rate = parseFloat(dialog.$wrapper.find('#item-rate-input').val()) || 0;
                if (!qty || qty <= 0) {
                    showStyledError('تنبيه', TEXT.QTY_GT_ZERO);
                    return;
                }
                if (!rate || rate <= 0) {
                    showStyledError('تنبيه', TEXT.RATE_GT_ZERO);
                    return;
                }
                let chosenUom = selectedUom || (uomRows[0] && uomRows[0].uom);
                let uomRow = uomRows.find(u => u.uom === chosenUom) || { conversion_factor: 1 };
                let conversion = parseFloat(uomRow.conversion_factor) || 1;
                let existing = pos_items.find(i => i.item_code === item.value && i.uom === chosenUom && i.rate === rate);
                if (existing) existing.qty += qty;
                else pos_items.unshift({
                    item_code: item.value,
                    item_name: item.label,
                    qty: qty,
                    rate: rate,
                    uom: chosenUom,
                    conversion_factor: conversion
                });
                renderItems();
                updateNewBtn();
                dialog.hide();

                // Show success feedback
                frappe.show_alert({
                    message: `<i class="fa fa-check-circle"></i> تمت إضافة ${item.label}`,
                    indicator: 'green'
                }, 2);
            }
        });

        let displayName = detail.item_name && detail.item_name !== item.label ? detail.item_name : null;
        let availability_text = (typeof detail.actual_qty === "number")
            ? detail.actual_qty
            : null;
        // If allow_negative_stock is enabled, show green (available) regardless of qty
        let stockColor = allow_negative_stock ? '#10b981' : (availability_text !== null ? (availability_text > 0 ? '#10b981' : '#ef4444') : '#64748b');
        let stockIcon = allow_negative_stock ? 'fa-check-circle' : (availability_text !== null ? (availability_text > 0 ? 'fa-check-circle' : 'fa-times-circle') : 'fa-info-circle');

        // Enhanced preview HTML - Centered and clean
        let preview_html = `
            <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                        border-radius: 12px;
                        padding: 16px;
                        margin-bottom: 12px;
                        border: 1px solid #e2e8f0;
                        text-align: center;">
                <div style="font-weight: 800; font-size: 1.2em; color: #1e293b; margin-bottom: 6px;">
                    ${escape_html(item.label)}
                </div>
                ${displayName ? `<div style="color: #64748b; font-size: 0.9em; font-weight: 600; margin-bottom: 4px;">${escape_html(displayName)}</div>` : ""}
                <div style="color: #94a3b8; font-size: 0.8em;">
                    ${escape_html(item.value)}
                </div>
                ${availability_text !== null ? `
                <div style="margin-top: 10px; display: inline-block; background: ${stockColor}; color: white; padding: 6px 16px; border-radius: 20px;">
                    <span style="font-weight: 700;">المتاح: ${format_float_text(availability_text)}</span>
                </div>
                ` : ''}
                ${baseRate ? `
                <div style="margin-top: 8px;">
                    <span style="background: #0ea5e9; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.85em; font-weight: 700;">
                        السعر: ${escape_html(format_currency_text(baseRate))}
                    </span>
                </div>
                ` : ""}
            </div>
        `;
        dialog.fields_dict.item_preview.wrapper.innerHTML = preview_html;

        // UOM buttons - Centered
        let uomWrapper = dialog.fields_dict.uom_buttons.wrapper;
        uomWrapper.innerHTML = `
            <div style="margin-bottom: 12px; text-align: center;">
                <div style="font-weight: 700; color: #374151; margin-bottom: 8px; font-size: 0.95em;">
                    الوحدة
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 6px; justify-content: center;">
                    ${uomRows.map(row => `
                        <button type="button" class="mini-pos-uom-btn-enhanced${row.uom === selectedUom ? ' active' : ''}" data-uom="${escape_html(row.uom)}"
                            style="padding: 8px 16px;
                                   border-radius: 8px;
                                   border: 2px solid ${row.uom === selectedUom ? '#6366f1' : '#d1d5db'};
                                   background: ${row.uom === selectedUom ? '#6366f1' : '#fff'};
                                   color: ${row.uom === selectedUom ? '#fff' : '#374151'};
                                   font-weight: 700;
                                   font-size: 0.95em;
                                   cursor: pointer;">
                            ${escape_html(row.uom)}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;

        // Quantity section - Centered
        let qtyWrapper = dialog.fields_dict.qty_section.wrapper;
        qtyWrapper.innerHTML = `
            <div style="margin-bottom: 12px; text-align: center;">
                <div style="font-weight: 700; color: #374151; margin-bottom: 8px; font-size: 0.95em;">
                    الكمية
                </div>
                <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
                    <button type="button" class="qty-btn qty-minus" style="width: 44px; height: 44px; border-radius: 10px; border: none; background: #ef4444; color: white; font-size: 1.4em; font-weight: 800; cursor: pointer;">−</button>
                    <input type="text" inputmode="decimal" id="item-qty-input" value="1"
                        style="width: 80px; height: 44px; border-radius: 10px; border: 2px solid #d1d5db; text-align: center; font-size: 1.3em; font-weight: 800; color: #1e293b;">
                    <button type="button" class="qty-btn qty-plus" style="width: 44px; height: 44px; border-radius: 10px; border: none; background: #10b981; color: white; font-size: 1.4em; font-weight: 800; cursor: pointer;">+</button>
                </div>
            </div>
        `;

        // Rate section - Centered
        let rateWrapper = dialog.fields_dict.rate_section.wrapper;
        rateWrapper.innerHTML = `
            <div style="margin-bottom: 8px; text-align: center;">
                <div style="font-weight: 700; color: #374151; margin-bottom: 8px; font-size: 0.95em;">
                    السعر
                </div>
                <input type="text" inputmode="decimal" id="item-rate-input" value="${initialRate.toFixed(2)}"
                    ${!allow_edit_price ? 'readonly' : ''}
                    style="width: 120px; height: 44px; border-radius: 10px; border: 2px solid ${allow_edit_price ? '#d1d5db' : '#e5e7eb'}; text-align: center; font-size: 1.3em; font-weight: 800; color: ${allow_edit_price ? '#1e293b' : '#9ca3af'}; background: ${allow_edit_price ? '#fff' : '#f3f4f6'};">
            </div>
        `;

        dialog.show();
        dialog.$wrapper.addClass('mini-pos-item-dialog');

        // Center the dialog and style it
        dialog.$wrapper.find('.modal-dialog').css({
            'max-width': '360px',
            'margin': '30px auto'
        });
        dialog.$wrapper.find('.modal-content').css({
            'border-radius': '16px',
            'overflow': 'hidden',
            'box-shadow': '0 20px 60px rgba(0,0,0,0.3)'
        });
        dialog.$wrapper.find('.modal-header').css({
            'background': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            'color': '#fff',
            'border': 'none',
            'padding': '14px 16px',
            'text-align': 'center'
        });
        dialog.$wrapper.find('.modal-title').css({
            'color': '#fff',
            'font-weight': '700',
            'font-size': '1.1em'
        });
        dialog.$wrapper.find('.modal-body').css({
            'padding': '16px',
            'max-height': '70vh',
            'overflow-y': 'auto'
        });
        dialog.$wrapper.find('.modal-footer').css({
            'padding': '12px 16px',
            'border-top': '1px solid #e5e7eb',
            'justify-content': 'center'
        });
        dialog.$wrapper.find('.btn-primary').css({
            'background': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            'border': 'none',
            'border-radius': '12px',
            'padding': '12px 28px',
            'font-weight': '700',
            'font-size': '1.1em',
            'box-shadow': '0 4px 12px rgba(16, 185, 129, 0.3)'
        });

        // Qty buttons handlers
        let $qtyInput = dialog.$wrapper.find('#item-qty-input');
        let $rateInput = dialog.$wrapper.find('#item-rate-input');

        dialog.$wrapper.on('click', '.qty-minus', function() {
            let current = parseFloat($qtyInput.val()) || 0;
            if (current > 1) $qtyInput.val((current - 1).toString());
        });

        dialog.$wrapper.on('click', '.qty-plus', function() {
            let current = parseFloat($qtyInput.val()) || 0;
            $qtyInput.val((current + 1).toString());
        });

        // Arabic to English number conversion
        $qtyInput.on('input', function() {
            let value = convertArabicToEnglishNumbers($(this).val());
            $(this).val(value);
        });
        $rateInput.on('input', function() {
            let value = convertArabicToEnglishNumbers($(this).val());
            $(this).val(value);
        });

        // Select all on focus
        $qtyInput.on('focus click', function() { $(this).select(); });
        $rateInput.on('focus click', function() { $(this).select(); });

        const roundCurrency = (val) => Math.round((val + Number.EPSILON) * 100) / 100;
        const getUomRow = (uomVal) => {
            return uomRows.find(u => u.uom === uomVal);
        };
        const getConversion = (uomVal) => {
            let row = getUomRow(uomVal);
            return parseFloat(row && row.conversion_factor) || 1;
        };
        let userEditedRate = false;
        if (allow_edit_price) {
            $rateInput.on('input', () => { userEditedRate = true; });
        }
        const applyRateForUom = (uomVal, force=false) => {
            if (!uomVal) return;
            let row = getUomRow(uomVal);
            // Use UOM-specific rate if available, otherwise calculate from base rate
            let newRate;
            if (row && row.rate !== undefined) {
                newRate = roundCurrency(parseFloat(row.rate));
            } else {
                let conversion = parseFloat(row && row.conversion_factor) || 1;
                newRate = roundCurrency(baseRate * conversion);
            }
            if (!allow_edit_price || force || !userEditedRate) {
                $rateInput.val(newRate.toFixed(2));
                userEditedRate = false;
            }
        };

        let $uomWrapper = $(uomWrapper);
        const setUomActive = (uomVal, { forceRate = false } = {}) => {
            if (!uomVal) return;
            selectedUom = uomVal;
            $uomWrapper.find('.mini-pos-uom-btn-enhanced').each(function() {
                let isActive = $(this).data('uom') === uomVal;
                $(this).css({
                    'border-color': isActive ? '#6366f1' : '#e2e8f0',
                    'background': isActive ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : '#fff',
                    'color': isActive ? '#fff' : '#374151',
                    'box-shadow': isActive ? '0 4px 12px rgba(99, 102, 241, 0.3)' : '0 2px 4px rgba(0,0,0,0.05)'
                });
            });
            applyRateForUom(uomVal, forceRate);
        };

        $uomWrapper.on('click', '.mini-pos-uom-btn-enhanced', function() {
            let choice = $(this).data('uom');
            if (choice) setUomActive(choice, { forceRate: true });
        });

        let initialUom = selectedUom || (uomRows[0] && uomRows[0].uom) || "";
        if (initialUom) setUomActive(initialUom, { forceRate: true });

        setTimeout(() => {
            $qtyInput.focus().select();
        }, 150);
    }

    function openItemCatalog() {
        if (!items.length) {
            showMsg(TEXT.NO_ITEMS_AVAILABLE, "error");
            return;
        }
        let dialog = ensureItemCatalogDialog();
        if (item_catalog_search) item_catalog_search.val('');
        renderItemCatalog('');
        dialog.show();
        setTimeout(() => item_catalog_search && item_catalog_search.focus(), 120);
    }
    function updateNewBtn() {
        let $btn = $('#mini-pos-header-refresh-btn');
        if ($btn.length) {
            $btn.prop('disabled', false);
        }
    }

    // --- Enhanced Styles + HTML ---
    let css = `<style>
    /* === ULTRA-ADVANCED RESPONSIVE DESIGN WITH GLASS MORPHISM === */

    /* Global dialog positioning - top center */
    .modal-dialog {
        margin: 20px auto !important;
    }
    .modal-footer {
        display: flex !important;
        justify-content: center !important;
        gap: 10px !important;
    }

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

    /* Main POS Card */
    .mini-pos-table th:first-child,
    .mini-pos-table td:first-child {
        text-align: center;
        width: 36px;
        color: #64748b;
        font-weight: 700;
    }

    .mini-pos-main {
        max-width: 560px;
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

    .mini-pos-main:hover {
        transform: translateY(-2px);
        box-shadow:
            0 12px 32px rgba(102, 126, 234, 0.2),
            0 16px 48px rgba(118, 75, 162, 0.15),
            inset 0 1px 1px rgba(255, 255, 255, 1);
    }

    .mini-pos-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
        border-radius: 26px 26px 0 0;
        position: relative;
        overflow: hidden;
        padding: 18px 16px 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        box-shadow:
            inset 0 -12px 24px rgba(102, 126, 234, 0.2),
            0 8px 24px rgba(118, 75, 162, 0.3);
        align-items: center;
        background-size: 200% 200%;
        animation: headerFlow 10s ease infinite;
    }

    /* Flowing gradient animation */
    @keyframes headerFlow {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
    }

    /* Glowing orbs in header */
    .mini-pos-header::after {
        content: '';
        position: absolute;
        width: 300px;
        height: 300px;
        background: radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, transparent 70%);
        top: -150px;
        right: -100px;
        border-radius: 50%;
        animation: orbFloat 8s ease-in-out infinite;
    }

    @keyframes orbFloat {
        0%, 100% { transform: translate(0, 0) scale(1); }
        50% { transform: translate(-20px, 20px) scale(1.1); }
    }

    /* Title text glow */
    .mini-pos-title {
        position: relative;
        z-index: 1;
        text-shadow: 0 2px 20px rgba(255, 255, 255, 0.3), 0 0 40px rgba(255, 255, 255, 0.2);
    }

    .mini-pos-header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-direction: row;
        flex-wrap: nowrap;
        width: 100%;
    }

    .mini-pos-header-modes-select {
        display: flex;
        align-items: center;
        min-width: 0;
        flex: 1 1 auto;
        position: relative;
        gap: 8px;
        justify-content: flex-start;
    }
    .mini-pos-mode-selector {
        border: 2px solid #fde68a;
        background: linear-gradient(to bottom, #ffffff 0%, #fefce8 100%);
        color: #0f172a;
        border-radius: 20px;
        padding: 12px 16px;
        font-weight: 700;
        font-size: 1em;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 160px;
        flex: 1 1 auto;
        max-width: 280px;
        height: 52px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        text-align: center;
        box-shadow: 0 3px 10px rgba(253, 230, 138, 0.4), 0 1px 3px rgba(0, 0, 0, 0.1);
        position: relative;
        overflow: hidden;
    }

    .mini-pos-mode-selector:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(253, 230, 138, 0.5), 0 2px 6px rgba(0, 0, 0, 0.15);
        border-color: #fbbf24;
        background: #fde68a;
    }

    .mini-pos-mode-selector:active {
        transform: translateY(1px);
    }

    .mini-pos-mode-selector i.fa-chevron-down {
        font-size: 0.85em;
        opacity: 0.7;
    }

    .mini-pos-mode-selector #mini-pos-mode-text {
        flex: 1;
        text-align: center;
    }
    .mini-pos-suggestions-header {
        top: calc(100% + 8px);
        box-shadow: 0 16px 38px #f59e4230;
        border-color: #fde68a;
    }
    .mini-pos-suggestions-header .mini-pos-suggestion-option {
        border-color: #fef3c7;
    }

    .mini-pos-header-actions {
        display: flex;
        gap: 8px;
        align-items: center;
        flex: 0 0 auto;
        min-width: 0;
    }

    .mini-pos-header-home-btn {
        flex: 0 0 auto;
        min-width: 120px;
        max-width: 160px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        height: 52px;
        padding: 0 18px;
        border-radius: 999px;
        font-size: 1em;
        font-weight: 700;
        border: none;
        cursor: pointer;
        transition: transform .15s ease, box-shadow .15s ease, background .15s ease;
        white-space: nowrap;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: #ffffff;
        box-shadow:
            0 4px 16px rgba(16, 185, 129, 0.4),
            0 0 20px rgba(16, 185, 129, 0.2),
            inset 0 1px 1px rgba(255, 255, 255, 0.3);
        position: relative;
        overflow: hidden;
    }

    /* Refresh button - blue color */
    #mini-pos-header-refresh-btn {
        min-width: 44px !important;
        max-width: 44px !important;
        padding: 0 !important;
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        box-shadow:
            0 4px 16px rgba(59, 130, 246, 0.4),
            0 0 20px rgba(59, 130, 246, 0.2),
            inset 0 1px 1px rgba(255, 255, 255, 0.3);
    }
    #mini-pos-header-refresh-btn:hover {
        background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
        transform: scale(1.05);
    }
    #mini-pos-header-refresh-btn:active {
        transform: scale(0.95);
    }

    /* Neon glow effect on home button */
    .mini-pos-header-home-btn::before {
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

    .mini-pos-header-home-btn:hover::before {
        animation: buttonGlow 2s ease-in-out infinite;
        opacity: 1;
    }

    @keyframes buttonGlow {
        0%, 100% { transform: translate(-25%, -25%) scale(0.8); }
        50% { transform: translate(-25%, -25%) scale(1.2); }
    }

    .mini-pos-header-home-btn:hover {
        transform: translateY(-2px);
        box-shadow:
            0 8px 24px rgba(16, 185, 129, 0.5),
            0 0 40px rgba(16, 185, 129, 0.3),
            inset 0 1px 1px rgba(255, 255, 255, 0.4);
    }

    .mini-pos-header-home-btn:active {
        transform: translateY(0);
        box-shadow:
            0 4px 12px rgba(16, 185, 129, 0.4),
            0 0 20px rgba(16, 185, 129, 0.2);
    }

    .mini-pos-header-home-btn[disabled] {
        background: #e2e8f0;
        color: #94a3b8;
        cursor: not-allowed;
        box-shadow: none;
        opacity: 0.8;
    }

    /* Collapsible Action Bar styles */
    .mini-pos-action-collapse {
        margin: 16px 0 20px 0;
    }
    .mini-pos-action-toggle-btn {
        width: 100%;
        background: linear-gradient(90deg,#e0e7ef 0,#bae6fd 100%);
        border: 1.5px solid #e0f2fe;
        border-radius: 13px;
        color: #0284c7;
        font-weight: 700;
        font-size: 1.09em;
        padding: 13px 0;
        margin-bottom: 15px;
        box-shadow: 0 1px 7px #bae6fd22;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        cursor: pointer;
        transition: background .17s, color .17s;
    }
    .mini-pos-action-toggle-btn .show-label,
    .mini-pos-action-toggle-btn .hide-label {
        display: inline-block;
    }
    .mini-pos-action-toggle-btn .fa {
        margin-right: 7px;
    }

    /* Action Bar Grid + Buttons */
    .mini-pos-action-bar {
        display: grid;
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 8px 8px;
        grid-auto-rows: minmax(50px, auto);
        width: 100%;
        margin-bottom: 12px;
        direction: rtl;
    }
    .mini-pos-act-btn, .mini-pos-act-label {
        min-height: 54px;
        font-size: 1.05em;
        font-weight: 800;
        border-radius: 12px;
        border: none;
        box-shadow: 0 3px 12px rgba(0,0,0,0.2);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: filter 0.16s, box-shadow 0.16s, transform 0.1s;
        width: 100%;
        text-shadow: 0 2px 4px rgba(0,0,0,0.35);
        cursor: pointer;
        letter-spacing: 0.03em;
        position: static;
        margin: 0;
        box-sizing: border-box;
        padding: 8px 10px;
        text-align: center;
        line-height: 1.3;
    }
    .mini-pos-act-btn:active, .mini-pos-act-label:active {
        transform: scale(0.97);
    }
    #mini-pos-return-btn      { background: linear-gradient(135deg, #f43f5e 0%, #ec4899 100%); }
    #mini-pos-ledger-btn      { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); }
    #mini-pos-invoice-history-btn { background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%); }
    #mini-pos-stock-btn       { background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); }
    #mini-pos-payment-btn     { background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); }
    #mini-pos-cancel-invoice-btn { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); }
    #mini-pos-discount-btn    { background: linear-gradient(135deg, #059669 0%, #10b981 100%); }
    #mini-pos-customer-orders-btn { background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); }
    #mini-pos-daily-sales-btn { background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); }
    #mini-pos-stock-txn-btn   { background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%); }
    #mini-pos-balance-btn     { background: linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%); }
    #mini-pos-expenses-btn    { background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%); }
    .mini-pos-act-btn[disabled], #mini-pos-payment-btn:disabled, #mini-pos-return-btn:disabled, #mini-pos-ledger-btn:disabled, #mini-pos-cancel-invoice-btn:disabled, #mini-pos-invoice-history-btn:disabled {
        filter: grayscale(1) brightness(1.12) opacity(0.65);
        cursor: not-allowed;
        pointer-events: none;
    }
    .mini-pos-act-btn-label, .mini-pos-act-label-label {
        font-size: 0.95em;
        font-weight: 800;
        margin-left: 0.3em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    /* Customer & Item Fields - Enhanced for Touch */
    .mini-pos-label {
        font-weight: 700;
        font-size: 1.05em;
        color: #1e293b;
        margin-bottom: 8px;
        letter-spacing: 0.02em;
        text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
    }

    .mini-pos-customer-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
    }

    .mini-pos-customer-col {
        flex: 1 1 0;
        min-width: 0;
        position: relative;
    }

    .mini-pos-customer-col input[type="text"] {
        width: 100%;
        min-width: 0;
        border-radius: 24px;
        border: 2px solid #bfdbfe;
        background: linear-gradient(to bottom, #ffffff 0%, #f9fafb 100%);
        font-size: 1.1em;
        padding: 12px 40px 12px 18px;
        min-height: 48px;
        box-shadow: 0 2px 8px rgba(14, 165, 233, 0.12), inset 0 1px 3px rgba(255, 255, 255, 0.8);
        text-align: right;
        transition: all 0.2s ease;
    }

    .mini-pos-customer-col input[type="text"]:focus {
        border-color: #0ea5e9;
        background: #ffffff;
        box-shadow: 0 4px 12px rgba(14, 165, 233, 0.25), 0 0 0 3px rgba(14, 165, 233, 0.1);
        outline: none;
    }

    .mini-pos-add-customer-btn {
        background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
        color: #fff;
        border: none;
        font-size: 1.1em;
        min-height: 48px;
        height: auto;
        border-radius: 24px;
        padding: 0 22px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 700;
        transition: all 0.2s ease;
        box-shadow: 0 3px 10px rgba(14, 165, 233, 0.3);
    }

    .mini-pos-add-customer-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(14, 165, 233, 0.4);
    }

    .mini-pos-add-customer-btn:active {
        transform: translateY(0);
    }

    .mini-pos-add-customer-btn[disabled],
    .mini-pos-add-customer-btn.disabled {
        background: #e5e7eb !important;
        color: #9ca3af !important;
        cursor: not-allowed !important;
        box-shadow: none !important;
        transform: none !important;
    }

    .mini-pos-browse-btn {
        width: 100%;
        min-height: 52px;
        height: auto;
        font-size: 1.12em;
        background: linear-gradient(135deg, #10b981 0%, #059669 50%, #0ea5e9 100%);
        color: #fff;
        border: none;
        border-radius: 20px;
        margin-top: 8px;
        font-weight: 700;
        box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        transition: all 0.2s ease;
        padding: 12px;
    }

    .mini-pos-browse-btn .fa {
        font-size: 1.2em;
    }

    .mini-pos-browse-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(16, 185, 129, 0.45);
    }

    .mini-pos-browse-btn:active {
        transform: translateY(0);
        filter: brightness(0.95);
    }

    .mini-pos-browse-btn:focus {
        outline: 3px solid rgba(186, 230, 253, 0.5);
        outline-offset: 2px;
    }
    .mini-pos-suggestions { position:absolute; top:calc(100% + 6px); left:0; right:0; background:#fff; border:1px solid #dbeafe; border-radius:16px; box-shadow:0 12px 28px #0ea5e911; max-height:240px; overflow:auto; display:none; z-index:25; padding:6px 0;}
    .mini-pos-suggestion-option { padding:8px 14px; cursor:pointer; display:flex; flex-direction:column; gap:4px; border-bottom:1px solid #f1f5f9; transition:background 0.12s, color 0.12s;}
    .mini-pos-suggestion-option:last-child { border-bottom:none; }
    .mini-pos-suggestion-option:hover, .mini-pos-suggestion-option.active { background:#e0f2fe; color:#0369a1;}
    .mini-pos-suggestion-primary { font-weight:600; font-size:1.02em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
    .mini-pos-suggestion-secondary { font-size:0.86em; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
    .mini-pos-suggestions-empty { padding:10px 16px; color:#94a3b8; text-align:center; font-size:0.95em;}
    .mini-pos-suggestions::-webkit-scrollbar { width:7px;}
    .mini-pos-suggestions::-webkit-scrollbar-thumb { background:#bae6fd; border-radius:10px;}
    .mini-pos-suggestion-highlight { background:#fef3c7; color:#92400e; padding:0 2px; border-radius:4px;}
    .mini-pos-item-name { font-weight:700; }
    .mini-pos-item-meta { font-size:0.82em; color:#64748b; text-align:right; }
    .mini-pos-item-catalog { display:flex; flex-direction:column; gap:14px; }
    .mini-pos-catalog-toolbar { display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between; background:#f1f5f9; border:1.5px solid #dbeafe; border-radius:18px; padding:10px 12px; }
    .mini-pos-filter-btn {
        border:1.5px solid #0ea5e9;
        background:#ffffff;
        color:#0ea5e9;
        border-radius:18px;
        padding:6px 12px;
        font-weight:600;
        display:inline-flex;
        align-items:center;
        gap:6px;
        cursor:pointer;
        transition:all .15s ease;
    }
    .mini-pos-filter-btn .fa { font-size:0.95em; }
    .mini-pos-filter-btn.active {
        background:#0ea5e9;
        color:#fff;
        box-shadow:0 4px 12px #0ea5e955;
    }
    .mini-pos-group-buttons {
        display:flex;
        flex-wrap:wrap;
        gap:8px;
        justify-content:flex-end;
        flex:1 1 auto;
    }
    .mini-pos-group-btn {
        border:1.5px solid #dbeafe;
        background:#ffffff;
        color:#0f172a;
        border-radius:16px;
        padding:6px 12px;
        font-weight:600;
        cursor:pointer;
        transition:all .15s ease;
        min-width:64px;
        text-align:center;
    }
    .mini-pos-group-btn.active {
        background:#38bdf8;
        color:#fff;
        border-color:#38bdf8;
        box-shadow:0 4px 10px #38bdf866;
    }
    .mini-pos-catalog-search input { width:100%; border-radius:16px; border:1.5px solid #dbeafe; background:#f9fafb; padding:9px 14px; font-size:1em; box-shadow:0 1px 6px #bae6fd44; }
    .mini-pos-catalog-grid {
        display:grid;
        grid-template-columns:repeat(auto-fill,minmax(140px,1fr));
        gap:12px;
        max-height:520px;
        overflow:auto;
        padding:8px;
    }
    .mini-pos-catalog-card {
        border:2px solid #e0f2fe;
        border-radius:16px;
        padding:12px;
        background:linear-gradient(145deg,#ffffff 0%,#f8fbff 100%);
        box-shadow:0 4px 12px rgba(14,165,233,0.12), 0 1px 4px rgba(14,165,233,0.06);
        cursor:pointer;
        display:flex;
        flex-direction:column;
        gap:8px;
        transition:all .25s cubic-bezier(0.4,0,0.2,1);
        min-height:140px;
        position:relative;
        overflow:hidden;
    }
    .mini-pos-catalog-card::before {
        content:'';
        position:absolute;
        top:0;
        left:0;
        right:0;
        height:3px;
        background:linear-gradient(90deg,#0ea5e9,#06b6d4);
        transform:scaleX(0);
        transition:transform .25s ease;
    }
    .mini-pos-catalog-card:hover::before { transform:scaleX(1); }
    .mini-pos-catalog-card:hover {
        transform:translateY(-4px) scale(1.02);
        box-shadow:0 8px 20px rgba(14,165,233,0.2), 0 2px 8px rgba(14,165,233,0.1);
        border-color:#0ea5e9;
    }
    .mini-pos-catalog-card.in-stock { border-color:#86efac; }
    .mini-pos-catalog-card.in-stock::before { background:linear-gradient(90deg,#10b981,#059669); }
    .mini-pos-catalog-card.out-stock { border-color:#fca5a5; opacity:0.6; }
    .mini-pos-catalog-card.out-stock::before { background:linear-gradient(90deg,#ef4444,#dc2626); }
    .mini-pos-catalog-card.disabled { cursor:not-allowed; }
    .mini-pos-catalog-card.disabled:hover { transform:none; box-shadow:0 4px 12px rgba(14,165,233,0.12); }
    .mini-pos-card-header {
        display:flex;
        align-items:center;
        justify-content:space-between;
        margin-bottom:2px;
    }
    .mini-pos-catalog-icon {
        width:36px;
        height:36px;
        border-radius:12px;
        background:linear-gradient(135deg,#e0f2fe 0%,#bae6fd 100%);
        display:flex;
        align-items:center;
        justify-content:center;
        color:#0369a1;
        font-size:1.1em;
        box-shadow:0 2px 8px rgba(14,165,233,0.15);
    }
    .mini-pos-catalog-card.in-stock .mini-pos-catalog-icon {
        background:linear-gradient(135deg,#d1fae5 0%,#a7f3d0 100%);
        color:#047857;
    }
    .mini-pos-stock-badge {
        width:24px;
        height:24px;
        border-radius:50%;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:0.8em;
    }
    .mini-pos-catalog-card.in-stock .mini-pos-stock-badge {
        background:#dcfce7;
        color:#15803d;
    }
    .mini-pos-catalog-card.out-stock .mini-pos-stock-badge {
        background:#fee2e2;
        color:#b91c1c;
    }
    .mini-pos-catalog-card.neutral .mini-pos-stock-badge {
        background:#e5e7eb;
        color:#64748b;
    }
    .mini-pos-catalog-name {
        font-weight:700;
        color:#0f172a;
        font-size:0.92em;
        line-height:1.3;
        min-height:2.6em;
        display:-webkit-box;
        -webkit-line-clamp:2;
        -webkit-box-orient:vertical;
        overflow:hidden;
        text-overflow:ellipsis;
    }
    .mini-pos-catalog-code {
        font-weight:600;
        color:#64748b;
        font-size:0.75em;
        letter-spacing:0.01em;
        padding:3px 8px;
        background:#f1f5f9;
        border-radius:6px;
        display:inline-block;
        align-self:flex-start;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
        max-width:100%;
    }
    .mini-pos-catalog-footer {
        margin-top:auto;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:6px;
        padding-top:8px;
        border-top:1px solid #e0f2fe;
    }
    .mini-pos-catalog-price {
        display:flex;
        align-items:center;
        gap:4px;
        font-size:0.8em;
        font-weight:700;
        color:#0ea5e9;
        background:#e0f2fe;
        padding:4px 8px;
        border-radius:8px;
        flex:1;
        min-width:0;
    }
    .mini-pos-catalog-price i {
        font-size:0.85em;
        flex-shrink:0;
    }
    .mini-pos-catalog-price span {
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
    }
    .mini-pos-catalog-qty {
        font-size:0.75em;
        font-weight:600;
        color:#475569;
        background:#f8fafc;
        padding:4px 8px;
        border-radius:8px;
        white-space:nowrap;
    }
    .mini-pos-catalog-empty {
        grid-column:1/-1;
        text-align:center;
        padding:60px 20px;
        color:#94a3b8;
        font-size:1.1em;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
    }
    .mini-pos-item-dialog .form-section-heading { margin-top: 0; }
    .mini-pos-item-dialog .modal-dialog {
        max-width: 360px !important;
        margin: 30px auto !important;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: calc(100vh - 60px);
    }
    .mini-pos-item-dialog .modal-content {
        border-radius: 16px !important;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3) !important;
        width: 100%;
    }
    .mini-pos-item-dialog .modal-header {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%) !important;
        color: #fff !important;
        border: none !important;
        padding: 14px 16px !important;
        text-align: center;
    }
    .mini-pos-item-dialog .modal-title {
        color: #fff !important;
        font-weight: 700 !important;
        font-size: 1.1em !important;
        width: 100%;
        text-align: center;
    }
    .mini-pos-item-dialog .modal-body {
        padding: 16px !important;
        max-height: 65vh;
        overflow-y: auto;
    }
    .mini-pos-item-dialog .modal-footer {
        padding: 12px 16px !important;
        border-top: 1px solid #e5e7eb !important;
        justify-content: center !important;
        display: flex !important;
    }
    .mini-pos-item-dialog .btn-primary {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
        border: none !important;
        border-radius: 12px !important;
        padding: 12px 28px !important;
        font-weight: 700 !important;
        font-size: 1.1em !important;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3) !important;
    }
    .mini-pos-item-dialog .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4) !important;
    }
    .mini-pos-stock-hint { font-size:0.85em; color:#64748b; margin-bottom:8px; background:#f8fafc; border-radius:10px; padding:8px 10px; }
    .mini-pos-total-wrap {
        display:grid;
        grid-template-columns: 1fr 1fr;
        gap:8px;
        margin:10px 0 8px 0;
        background:#f8fafc;
        padding:10px;
        border-radius:12px;
    }
    .mini-pos-total-row {
        display:contents;
    }
    .mini-pos-total-pill {
        background:#fff;
        border-radius:10px;
        padding:6px 12px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        font-weight:700;
        font-size:0.95em;
        box-shadow:0 2px 6px rgba(0,0,0,0.04);
        gap:8px;
        min-height:42px;
    }
    .mini-pos-total-pill span:first-child { font-size:0.85em; font-weight:600; opacity:0.8; }
    .mini-pos-total-pill span:last-child { font-variant-numeric:tabular-nums; font-size:1.05em; }
    .mini-pos-total-pill.total { background:linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%); color:#0369a1; border:1px solid #7dd3fc; }
    .mini-pos-total-pill.grand { background:linear-gradient(135deg, #fef9c3 0%, #fde047 100%); color:#a16207; font-size:1em; border:1px solid #fde047; }
    .mini-pos-total-field {
        background:#fff;
        border-radius:10px;
        padding:6px 10px;
        display:flex;
        flex-direction:column;
        gap:3px;
        box-shadow:0 2px 6px rgba(0,0,0,0.04);
        border:1px solid #e2e8f0;
    }
    .mini-pos-total-field-label { font-weight:600; color:#64748b; font-size:0.8em; }
    .mini-pos-total-field input {
        border-radius:8px;
        border:1px solid #cbd5e1;
        text-align:right;
        padding:5px 10px;
        background:#fff;
        direction:rtl;
        font-weight:700;
        color:#0f172a;
        font-size:0.95em;
        height:28px;
    }
    .mini-pos-total-field input:focus {
        border-color:#0ea5e9;
        outline:none;
        box-shadow:0 0 0 3px rgba(14,165,233,0.1);
    }
    .mini-pos-total-field-value {
        display:none;
    }
    .mini-pos-uom-buttons {
        display:flex;
        flex-wrap:wrap;
        gap:8px;
        justify-content:center;
        margin:10px 0 14px;
        direction: rtl;
    }
    .mini-pos-uom-btn {
        border:1.5px solid #bae6fd;
        background:#fff;
        color:#0284c7;
        border-radius:18px;
        padding:6px 14px;
        font-weight:600;
        cursor:pointer;
        transition:all .15s ease;
        min-width:64px;
    }
    .mini-pos-uom-btn.active {
        background:#0ea5e9;
        color:#fff;
        border-color:#0ea5e9;
        box-shadow:0 4px 10px #0ea5e966;
    }
    .mini-pos-uom-btn:hover {
        background:#e0f2fe;
    }
    .mini-pos-catalog-card.disabled { opacity:0.45; cursor:not-allowed; pointer-events:none; }
    .mini-pos-catalog-empty { text-align:center; color:#94a3b8; padding:30px 10px; font-size:1em; }

    /* Table Styles */
    .mini-pos-table { width:100%; border-radius:8px; overflow:hidden; background:#f7fafc; font-size:1em; margin-top:10px;}
    .mini-pos-table th, .mini-pos-table td { padding:7px 5px; text-align:right;}
    .mini-pos-table th { background:#e0e7ef; font-weight:700; font-size:0.97em;}

    /* Footer & Totals */
    .mini-pos-footer { margin-top:14px; text-align:center; padding:0 10px;}
    .mini-pos-btn-lg { width:100%; font-size:1.13em; padding:13px 0; border-radius:18px; font-weight:700; background:linear-gradient(90deg,#0ea5e9 0,#22d3ee 100%);}
    #mini-pos-result { margin-top:12px; margin-bottom:0;}
    .mini-pos-success, .mini-pos-error { border-radius:7px; padding:10px 11px; font-size:1em; margin-bottom:8px; font-weight:500;}
    .mini-pos-success { background:#e6fff4; border:1px solid #b7f7d8; color:#1b7e3b;}
    .mini-pos-error { background:#fff7f7; border:1px solid #f7b7b7; color:#b71b1b;}

    /* Table Row Button Styles */
    .mini-pos-table-btn-danger {
        background: linear-gradient(90deg,#f87171 0,#fbbf24 100%);
        color: #fff !important;
        border: none;
        border-radius: 16px;
        font-size: 1.08em;
        font-weight: 700;
        padding: 4px 10px;
        box-shadow: 0 1px 5px #f8717130;
        transition: filter .13s, box-shadow .13s, background .13s;
    }
    .mini-pos-table-btn-danger:active,
    .mini-pos-table-btn-danger:focus {
        filter: brightness(0.93);
        box-shadow: 0 2px 8px #f8717140;
    }
    .mini-pos-table-btn-danger:hover {
        background: linear-gradient(90deg,#f87171 0,#f59e42 100%);
        filter: brightness(1.05);
    }
    .mini-pos-table-btn-primary {
        background: linear-gradient(90deg,#0ea5e9 0,#22d3ee 100%);
        color: #fff !important;
        border: none;
        border-radius: 16px;
        font-size: 1.08em;
        font-weight: 700;
        padding: 4px 14px;
        box-shadow: 0 1px 5px #0ea5e930;
        transition: filter .13s, box-shadow .13s, background .13s;
    }
    .mini-pos-table-btn-primary:active,
    .mini-pos-table-btn-primary:focus {
        filter: brightness(0.97);
        box-shadow: 0 2px 8px #0ea5e940;
    }
    .mini-pos-table-btn-primary:hover {
        background: linear-gradient(90deg,#0ea5e9 0,#38bdf8 100%);
        filter: brightness(1.04);
    }

    /* Dialog Buttons */
    .frappe-dialog .modal-footer .btn {
        border-radius: 18px !important;
        font-weight: 700 !important;
        font-size: 1.08em !important;
        padding: 10px 30px !important;
    }
    .frappe-dialog .modal-footer .btn-primary {
        background: linear-gradient(90deg,#10b981 0,#22d3ee 100%);
        border: none;
    }
    .frappe-dialog .modal-footer .btn-secondary {
        background: #f3f4f6;
        color: #333;
        border: 1.5px solid #e5e7eb;
    }

    /* === ENHANCED RESPONSIVE DESIGN === */

    /* Tablet Landscape (1024px and below) */
    @media (max-width: 1024px) {
        .mini-pos-main {
            max-width: 95%;
            margin: 20px auto 0;
        }
    }

    /* Tablet Portrait (768px and below) */
    @media (max-width: 768px) {
        .mini-pos-main {
            max-width: 100%;
            margin: 12px auto 0;
            padding: 16px 12px 24px 12px;
            border-radius: 20px;
        }

        .mini-pos-header {
            border-radius: 20px 20px 0 0;
            padding: 14px 12px 16px;
        }

        .mini-pos-header-row {
            gap: 10px;
        }

        .mini-pos-mode-selector {
            min-width: 140px;
            font-size: 0.95em;
            padding: 10px 14px;
        }

        .mini-pos-header-home-btn {
            min-width: 110px;
            font-size: 0.95em;
            padding: 0 16px;
        }

        .mini-pos-browse-btn {
            min-height: 54px;
            font-size: 1.12em;
        }

        .mini-pos-action-bar {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
        }
    }

    /* Mobile (600px and below) */
    @media (max-width: 600px) {
        .mini-pos-main {
            max-width: 100vw;
            border-radius: 0;
            margin: 0;
            padding: 12px 4vw 20px 4vw;
            border-left: none;
            border-right: none;
        }

        .mini-pos-header {
            border-radius: 0;
            padding: 12px 10px 14px;
        }

        .mini-pos-header-row {
            gap: 8px;
        }

        .mini-pos-mode-selector {
            min-width: 120px;
            font-size: 0.9em;
            padding: 10px 12px;
            gap: 6px;
        }

        .mini-pos-header-home-btn {
            min-width: 100px;
            font-size: 0.9em;
            padding: 0 14px;
        }

        .mini-pos-action-bar {
            gap: 10px;
            grid-template-columns: 1fr 1fr;
            grid-auto-rows: minmax(52px, auto);
        }

        .mini-pos-act-btn,
        .mini-pos-act-label {
            min-height: 52px;
            font-size: 1.05em;
            border-radius: 12px;
            padding: 8px 4px;
        }

        .mini-pos-total-row {
            flex-direction: column;
            gap: 10px;
        }

        .mini-pos-action-toggle-btn {
            min-height: 48px;
            font-size: 1.05em;
            border-radius: 14px;
            padding: 10px 0;
        }

        .mini-pos-catalog-grid {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 12px;
        }

        .mini-pos-customer-col input[type="text"] {
            font-size: 1.05em;
            padding: 14px 42px 14px 16px;
            min-height: 52px;
        }

        .mini-pos-add-customer-btn {
            min-height: 52px;
            font-size: 1.05em;
            padding: 0 18px;
        }

        .mini-pos-label {
            font-size: 1.08em;
            margin-bottom: 10px;
        }
    }

    /* Small Mobile (400px and below) */
    @media (max-width: 400px) {
        .mini-pos-main {
            padding: 10px 3vw 18px 3vw;
        }

        .mini-pos-mode-btn {
            min-width: 85px;
            font-size: 0.95em;
            padding: 8px 12px;
        }

        .mini-pos-action-bar {
            gap: 8px;
            grid-template-columns: 1fr;
        }

        .mini-pos-catalog-grid {
            grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
            gap: 10px;
        }
    }

    /* === ENHANCED TABLE STYLES === */
    .mini-pos-table-scroll {
        max-height: 360px;
        overflow-y: auto;
        overflow-x: hidden;
        border-radius: 0 0 12px 12px;
        background: linear-gradient(to bottom, #ffffff 0%, #f7fafc 100%);
        scrollbar-width: thin;
        scrollbar-color: #bfdbfe #f1f5f9;
    }

    .mini-pos-table-scroll::-webkit-scrollbar {
        width: 8px;
    }

    .mini-pos-table-scroll::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 10px;
    }

    .mini-pos-table-scroll::-webkit-scrollbar-thumb {
        background: linear-gradient(to bottom, #93c5fd, #60a5fa);
        border-radius: 10px;
        transition: background 0.2s;
    }

    .mini-pos-table-scroll::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(to bottom, #60a5fa, #3b82f6);
    }

    .mini-pos-table-scroll tbody tr {
        background: #fff;
        transition: all 0.2s ease;
    }

    .mini-pos-table-scroll tbody tr:hover {
        background: #e0f2fe;
        transform: scale(1.01);
        box-shadow: 0 2px 8px rgba(14, 165, 233, 0.1);
    }

    .mini-pos-table-scroll table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
    }

    .mini-pos-table thead th {
        position: sticky;
        top: 0;
        background: linear-gradient(to bottom, #e0f2fe 0%, #dbeafe 100%);
        z-index: 2;
        box-shadow: 0 2px 4px rgba(14, 165, 233, 0.1);
    }

    .mini-pos-table-wrap {
        background: linear-gradient(to bottom, #f7fafc 0%, #f1f5f9 100%);
        border-radius: 14px;
        margin-top: 14px;
        box-shadow: 0 2px 10px rgba(224, 231, 239, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.6);
        overflow: hidden;
        width: 100%;
        border: 2px solid #e0f2fe;
    }

    .mini-pos-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        background: #fff;
        font-size: 1em;
    }

    .mini-pos-table th,
    .mini-pos-table td {
        padding: 12px 10px;
        border-bottom: 1px solid #e0f2fe;
        font-size: 1em;
        transition: background 0.2s ease;
    }

    .mini-pos-table th {
        background: linear-gradient(to bottom, #e0f2fe 0%, #dbeafe 100%);
        font-weight: 700;
        font-size: 1em;
        color: #0284c7;
        position: sticky;
        top: 0;
        z-index: 1;
        }
        .mini-pos-table-scroll {
        max-height: 336px; /* 8 rows x 42px */
        overflow-y: auto;
        overflow-x: hidden;
        background: #fff;
        }
        .mini-pos-table-scroll tbody tr:nth-child(odd) { background: #f7fafc; }
        .mini-pos-table-scroll tbody tr:hover { background: #e0f2fe; }
        @media (max-width: 600px) {
        .mini-pos-table th, .mini-pos-table td { padding: 7px 4px; font-size: 0.93em }
        .mini-pos-table-scroll { max-height: 270px; }
        .mini-pos-action-bar { grid-template-columns: 1fr; }
    }

        /* For visually better focus */
        .mini-pos-table-scroll:focus { outline: 2px solid #38bdf8; }

        /* === ADVANCED BUTTON ANIMATIONS === */

        /* Success button pulse animation */
        @keyframes successPulse {
            0%, 100% {
                box-shadow: 0 4px 16px rgba(34, 197, 94, 0.4), 0 0 0 0 rgba(34, 197, 94, 0.4);
            }
            50% {
                box-shadow: 0 6px 24px rgba(34, 197, 94, 0.6), 0 0 0 8px rgba(34, 197, 94, 0);
            }
        }

        .btn-success:not(:disabled) {
            animation: successPulse 2s ease-in-out infinite;
        }

        .btn-success:hover:not(:disabled) {
            animation: none;
            transform: translateY(-2px) scale(1.02);
            box-shadow: 0 8px 32px rgba(34, 197, 94, 0.5);
        }

        /* Icon spin on hover for action buttons */
        .mini-pos-header-home-btn:hover i,
        .mini-pos-mode-selector:hover i.fa-credit-card {
            animation: iconBounce 0.6s ease;
        }

        @keyframes iconBounce {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.2); }
        }

        /* Shimmer effect for browse items button */
        .mini-pos-browse-btn {
            position: relative;
            overflow: hidden;
        }

        .mini-pos-browse-btn::after {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
            animation: shimmer 3s ease-in-out infinite;
        }

        @keyframes shimmer {
            0% { left: -100%; }
            50%, 100% { left: 100%; }
        }

        /* Ripple effect on button click */
        .mini-pos-mode-selector,
        .st-direction-btn,
        .mini-pos-header-home-btn {
            position: relative;
            overflow: hidden;
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

        /* Glass morphism for cards on hover */
        .mini-pos-main:hover {
            backdrop-filter: blur(25px) saturate(200%);
            -webkit-backdrop-filter: blur(25px) saturate(200%);
        }

        /* Mobile responsive for totals - stack on very small screens */
        @media (max-width: 400px) {
            .mini-pos-total-wrap {
                grid-template-columns: 1fr;
                gap:6px;
                padding:8px;
            }
            .mini-pos-total-pill, .mini-pos-total-field {
                min-height:38px;
                font-size:0.9em;
            }
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

    let html = `
    ${css}
    <div class="mini-pos-main">
        <div class="mini-pos-header">
            <div class="mini-pos-header-row">
  <div class="mini-pos-header-modes-select">
    <button type="button" id="mini-pos-mode-selector" class="mini-pos-mode-selector">
      <i class="fa fa-credit-card"></i>
      <span id="mini-pos-mode-text">وسيلة الدفع</span>
      <i class="fa fa-chevron-down"></i>
    </button>
  </div>
  <div class="mini-pos-header-actions" style="display:flex; gap:8px; align-items:center;">
    <button type="button" id="mini-pos-header-refresh-btn" class="mini-pos-header-home-btn" title="تحديث الصفحة" style="min-width:40px;padding:8px 12px;">
      <i class="fa fa-refresh"></i>
    </button>
    <button type="button" id="mini-pos-header-home-btn" class="mini-pos-header-home-btn" title="الصفحة الرئيسية">
      <i class="fa fa-home"></i> الرئيسية
    </button>
  </div>
</div>
        </div>
        <div class="mini-pos-action-collapse">
            <button id="mini-pos-action-toggle" class="mini-pos-action-toggle-btn" type="button">
                <span class="show-label"><i class="fa fa-bars"></i> ${TEXT.SHOW_ACTIONS}</span>
                <span class="hide-label" style="display:none;"><i class="fa fa-times"></i> ${TEXT.HIDE_ACTIONS}</span>
            </button>
            <div class="mini-pos-action-bar" id="mini-pos-action-bar" style="display:none;">
                <button type="button" id="mini-pos-ledger-btn" class="mini-pos-act-btn" title="${TEXT.CUSTOMER_LEDGER}" disabled>
                    <span class="mini-pos-act-btn-label">${TEXT.LEDGER}</span>
                </button>
                <button type="button" id="mini-pos-invoice-history-btn" class="mini-pos-act-btn" title="${TEXT.INVOICE_HISTORY_TITLE}" disabled>
                    <i class="fa fa-history" style="margin-left:6px;"></i>
                    <span class="mini-pos-act-btn-label">${TEXT.INVOICE_HISTORY}</span>
                </button>
                <div id="mini-pos-balance-btn" class="mini-pos-act-label" tabindex="0" title="${TEXT.POS_BALANCE_BTN}">
                    <img src="/assets/mobile_pos/pos-icon.jpg" alt="POS" style="width:24px; height:24px; margin-left:6px; border-radius:4px;">
                    <span class="mini-pos-act-label-label">${TEXT.POS_BALANCE_BTN}</span>
                </div>
                <button type="button" id="mini-pos-stock-btn" class="mini-pos-act-btn" title="${TEXT.STOCK_BALANCE_TITLE}">
                    <img src="/assets/mobile_pos/car.png" alt="Stock" style="width:24px; height:24px; margin-left:6px;">
                    <span class="mini-pos-act-btn-label">${TEXT.STOCK}</span>
                </button>
                <button type="button" id="mini-pos-payment-btn" class="mini-pos-act-btn" title="${TEXT.PAYMENT}" disabled>
                    <span class="mini-pos-act-btn-label">${TEXT.PAYMENT}</span>
                </button>
                <button type="button" id="mini-pos-return-btn" class="mini-pos-act-btn" title="${TEXT.RETURN}" disabled>
                    <span class="mini-pos-act-btn-label">${TEXT.RETURN}</span>
                </button>
                <button type="button" id="mini-pos-cancel-invoice-btn" class="mini-pos-act-btn" title="${TEXT.CANCEL_INVOICE_TITLE}" disabled>
                    <span class="mini-pos-act-btn-label">${TEXT.CANCEL_INVOICE}</span>
                </button>
                <button type="button" id="mini-pos-customer-orders-btn" class="mini-pos-act-btn" title="طلبات العملاء">
                    <i class="fa fa-file-text-o" style="margin-left:6px;"></i>
                    <span class="mini-pos-act-btn-label">طلبات العملاء</span>
                </button>
                <button type="button" id="mini-pos-daily-sales-btn" class="mini-pos-act-btn" title="مبيعات اليوم">
                    <i class="fa fa-bar-chart" style="margin-left:6px;"></i>
                    <span class="mini-pos-act-btn-label">مبيعات اليوم</span>
                </button>
                <button type="button" id="mini-pos-expenses-btn" class="mini-pos-act-btn" title="المصروفات">
                    <i class="fa fa-money" style="margin-left:6px;"></i>
                    <span class="mini-pos-act-btn-label">المصروفات</span>
                </button>
                <button type="button" id="mini-pos-discount-btn" class="mini-pos-act-btn" title="${TEXT.CUSTOMER_DISCOUNT}" disabled>
                    <i class="fa fa-percent" style="margin-left:6px;"></i>
                    <span class="mini-pos-act-btn-label">${TEXT.CUSTOMER_DISCOUNT}</span>
                </button>
                <button type="button" id="mini-pos-total-credit-btn" class="mini-pos-act-btn" title="${TEXT.TOTAL_USER_CREDIT}">
                    <i class="fa fa-credit-card" style="margin-left:6px;"></i>
                    <span class="mini-pos-act-btn-label">${TEXT.TOTAL_USER_CREDIT}</span>
                </button>

            </div>
        </div>
        <div class="mini-pos-section">
            <div class="mini-pos-label">${TEXT.CUSTOMER}</div>
            <div class="mini-pos-customer-row">
                <div class="mini-pos-customer-col mini-pos-relative">
                    <input id="mini-pos-customer" type="text" placeholder="${TEXT.CUSTOMER_PLACEHOLDER}" autocomplete="off" required>
                    <div id="mini-pos-customer-suggestions" class="mini-pos-suggestions" role="listbox"></div>
                </div>
                <button type="button" id="mini-pos-add-customer-btn" class="mini-pos-add-customer-btn${allow_add_customer ? '' : ' disabled'}" title="${TEXT.ADD_CUSTOMER}" ${allow_add_customer ? '' : 'disabled tabindex="-1"'}>
                    <i class="fa fa-user-plus"></i> ${TEXT.ADD_CUSTOMER}
                </button>
            </div>
            <div class="mini-pos-label">${TEXT.ITEMS}</div>
            <button type="button" id="mini-pos-browse-items" class="mini-pos-browse-btn" title="${TEXT.BROWSE_ITEMS}">
                <i class="fa fa-th-large"></i> ${TEXT.BROWSE_ITEMS}
            </button>
            <div class="mini-pos-table-wrap">
            <table class="mini-pos-table">
                <thead>
                <tr>
                    <th>#</th>
                    <th>${TEXT.TABLE_ITEM_NAME}</th>
                    <th>${TEXT.TABLE_UOM}</th>
                    <th>${TEXT.TABLE_QTY}</th>
                    <th>${TEXT.TABLE_RATE}</th>
                    <th style="width:44px;">&nbsp;</th>
                </tr>
                </thead>
            </table>
            <div class="mini-pos-table-scroll" tabindex="0" aria-label="قائمة الأصناف">
                <table class="mini-pos-table">
                <tbody id="mini-pos-items"></tbody>
                </table>
            </div>
            </div>
            <div id="mini-pos-total"></div>
            <div id="mini-pos-result"></div>
        </div>
        <div class="mini-pos-footer">
            <button id="mini-pos-submit" class="btn btn-success mini-pos-btn-lg" style="max-width:340px;">
                <i class="fa fa-check"></i> ${TEXT.SUBMIT_PRINT}
            </button>
        </div>
    </div>
    `;

    $(wrapper).html(html);
    let storedMode = getSavedMode();
    let modeDefaultValue = resolveDefaultMode();
    selected_mode_value = setModeSelection(modeDefaultValue, { syncStorage: storedMode === null, render: false });
    renderModeButtons();
    const customerSelector = createSmartSelector({
        inputSelector: '#mini-pos-customer',
        containerSelector: '#mini-pos-customer-suggestions',
        data: customers,
        maxResults: 12,
        emptyText: TEXT.NO_CUSTOMERS_MATCH,
        onSelect: () => {
            update_top_action_btns();
            updateNewBtn();
        }
    });
    // Collapsible Action Bar Logic
    $(wrapper).on('click', '#mini-pos-action-toggle', function() {
        let $bar = $('#mini-pos-action-bar', wrapper);
        let $btn = $(this);
        let expanded = $bar.is(':visible');
        if(expanded) {
            $bar.slideUp(140);
            $btn.find('.show-label').show();
            $btn.find('.hide-label').hide();
        } else {
            $bar.slideDown(140);
            $btn.find('.show-label').hide();
            $btn.find('.hide-label').show();
        }
    });
    setTimeout(()=>$('#mini-pos-customer').focus(), 10);

    // === UI EVENTS ===
    $(wrapper).on('input', '#mini-pos-customer', function() {
        updateNewBtn();
        update_top_action_btns();
    });
    $(wrapper).on('click', '#st-home', function(e) {
    e.preventDefault();
    window.location.href = "/main";
    });
    // Discount field - same pattern as qty/rate in item dialog
    $(wrapper).on('input', '#mini-pos-discount', function() {
        let $this = $(this);
        let cursorPos = this.selectionStart;
        let oldValue = $this.val();
        let value = convertArabicToEnglishNumbers(oldValue);

        if (value !== oldValue) {
            $this.val(value);
            // Restore cursor position
            this.setSelectionRange(cursorPos, cursorPos);
        }

        discount_amount = Math.max(0, parseFloat(value) || 0);
    });
    $(wrapper).on('focus click', '#mini-pos-discount', function() {
        $(this).select();
    });
    $(wrapper).on('blur', '#mini-pos-discount', function() {
        let value = convertArabicToEnglishNumbers($(this).val());
        let val = Math.max(0, parseFloat(value) || 0);
        $(this).val(val.toFixed(2));
        discount_amount = val;
        renderTotal();
    });

    // Paid amount field - same pattern as qty/rate in item dialog
    $(wrapper).on('input', '#mini-pos-paid', function() {
        let $this = $(this);
        let cursorPos = this.selectionStart;
        let oldValue = $this.val();
        let value = convertArabicToEnglishNumbers(oldValue);

        if (value !== oldValue) {
            $this.val(value);
            // Restore cursor position
            this.setSelectionRange(cursorPos, cursorPos);
        }

        paid_amount_manual = true;
        paid_amount = Math.max(0, parseFloat(value) || 0);
    });
    $(wrapper).on('focus click', '#mini-pos-paid', function() {
        $(this).select();
    });
    $(wrapper).on('blur', '#mini-pos-paid', function() {
        let value = convertArabicToEnglishNumbers($(this).val());
        let val = Math.max(0, parseFloat(value) || 0);
        $(this).val(val.toFixed(2));
        paid_amount = val;
        renderTotal();
    });
    // Select all text in quantity inputs when focused/clicked and convert Arabic numbers
    $(wrapper).on('focus click', '.mini-pos-row-qty', function() {
        $(this).select();
    });
    $(wrapper).on('input', '.mini-pos-row-qty', function() {
        let value = convertArabicToEnglishNumbers($(this).val());
        $(this).val(value);
    });
    $(wrapper).on('click', '#mini-pos-mode-selector', function() {
        openModeSelectionDialog();
    });
    $(wrapper).on('click', '#mini-pos-header-home-btn', function(e) {
        e.preventDefault();
        window.location.href = "/main";
    });
    // Refresh button - reload the page with confirmation popup (large buttons)
    $(wrapper).on('click', '#mini-pos-header-refresh-btn', function(e) {
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
                            <button type="button" class="btn refresh-yes-btn" style="
                                background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                                color: white; border: none; padding: 18px 50px; font-size: 1.3em;
                                font-weight: 700; border-radius: 16px; min-width: 130px;
                                box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4);
                            ">نعم</button>
                            <button type="button" class="btn refresh-no-btn" style="
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
        dialog.$wrapper.find('.refresh-yes-btn').on('click', function() {
            dialog.hide();
            $btn.find('i').addClass('fa-spin');
            $btn.prop('disabled', true);
            frappe.show_alert({message: 'جاري التحديث...', indicator: 'blue'}, 2);
            setTimeout(() => location.reload(), 500);
        });
        dialog.$wrapper.find('.refresh-no-btn').on('click', function() {
            dialog.hide();
        });
        dialog.show();
    });
    $(wrapper).on('click', '#mini-pos-browse-items', function(e){
        e.preventDefault();
        if (return_mode) {
            showStyledError('تنبيه', TEXT.RETURN_MODE_BLOCK);
            return;
        }
        openItemCatalog();
    });

    $(wrapper).on('click', '#mini-pos-stock-txn-btn', async function() {
        // Step 1: Fetch warehouses for main stock
        let wh_res = await frappe.db.get_list('Warehouse', {
            fields: ['name'],
            filters: { is_group: 0 },
            limit: 100
        });
        let warehouses = wh_res.map(wh => wh.name);

        // Step 2: Build dialog with HTML marker for dynamic rows
        let dialog = new frappe.ui.Dialog({
            title: TEXT.STOCK_TRANSACTION,
            fields: [
                { fieldtype: 'Select', label: TEXT.TRANSACTION_TYPE, fieldname: 'txn_type', options: 'Add Stock\nReturn Stock', reqd: 1, default: 'Add Stock' },
                { fieldtype: 'Select', label: TEXT.MAIN_WAREHOUSE, fieldname: 'main_warehouse', options: warehouses.join('\n'), reqd: 1 },
                { fieldtype: 'HTML', fieldname: 'items_html', options: `<div class="mini-pos-stock-hint">${TEXT.STOCK_DIALOG_HINT}</div><div id="items-table"></div>
                    <button class="btn btn-xs btn-primary" id="add-row-btn" type="button" style="margin-top:10px;"><i class="fa fa-plus"></i> ${TEXT.ADD_ROW}</button>
                ` }
            ],
            primary_action_label: TEXT.SUBMIT_BTN,
            primary_action: async (values) => {
                if (!item_rows.length || !item_rows.every(r => r.item_code && r.qty > 0)) {
                    showStyledError('تنبيه', TEXT.STOCK_TRANSFER_VALIDATE);
                    return;
                }
                dialog.set_primary_action(TEXT.WORKING, null);
                try {
                    await frappe.call({
                        method: "mobile_pos.mobile_pos.page.mini_pos.api.mini_pos_stock_transfer",
                        args: {
                            txn_type: values.txn_type,
                            main_warehouse: values.main_warehouse,
                            pos_warehouse: warehouse,
                            items: item_rows
                        }
                    });
                    showStyledSuccess('تم بنجاح', TEXT.STOCK_TRANSFER_SUCCESS);
                    dialog.hide();
                } catch (e) {
                    showStyledError('خطأ', e.message || TEXT.STOCK_TRANSFER_ERROR);
                    dialog.set_primary_action(TEXT.SUBMIT_BTN, dialog._primary_action);
                }
            }
        });

        // Step 3: Dynamic fields management
        let item_rows = [{item_code:'', qty:1, item_name:''}];
        let controls = [];

        function get_item_name(item_code) {
            let found = items.find(i => i.value === item_code);
            return found ? found.label : '';
        }

        function render_items_table() {
    let $table = $(`<table class="table table-bordered" style="background:#fff;">
        <thead>
            <tr>
                <th style="width:28%">${TEXT.ITEM_LABEL}</th>
                <th style="width:32%">${TEXT.TABLE_ITEM_NAME}</th>
                <th style="width:20%">${TEXT.QTY_LABEL}</th>
                <th style="width:20%"></th>
            </tr>
        </thead>
        <tbody></tbody>
    </table>`);
    controls = [];
    item_rows.forEach((row, i) => {
        let $row = $('<tr>');
        let $item_td = $('<td>');
        let $name_td = $('<td>');
        let $qty_td = $('<td>');
        let $del_td = $('<td style="text-align:center"></td>');
        $row.append($item_td, $name_td, $qty_td, $del_td);

        // Item Link
        let item_ctrl = frappe.ui.form.make_control({
            df: {
                label: TEXT.ITEM_LABEL,
                fieldtype: "Link",
                options: "Item",
                fieldname: "item_code_" + i,
                reqd: 1,
                onchange: function() {
                    let val = item_ctrl.get_value();
                    item_rows[i].item_code = val;
                    item_rows[i].item_name = get_item_name(val);
                    $name_td.text(item_rows[i].item_name);
                }
            },
            parent: $item_td,
            render_input: true
        });
        item_ctrl.set_value(row.item_code);

        $name_td.text(row.item_code ? get_item_name(row.item_code) : '');

        // Qty Float
        let qty_ctrl = frappe.ui.form.make_control({
            df: {
                label: TEXT.QTY_LABEL,
                fieldtype: "Float",
                fieldname: "qty_" + i,
                reqd: 1,
                onchange: function() {
                    let value = convertArabicToEnglishNumbers(String(qty_ctrl.get_value() || ''));
                    item_rows[i].qty = parseFloat(value) || 0;
                }
            },
            parent: $qty_td,
            render_input: true
        });
        qty_ctrl.set_value(row.qty);

        // Add Arabic to English conversion and select-all for qty field
        if (qty_ctrl.$input) {
            qty_ctrl.$input.attr('inputmode', 'decimal');
            qty_ctrl.$input.on('input', function() {
                let value = convertArabicToEnglishNumbers($(this).val());
                $(this).val(value);
            });
            qty_ctrl.$input.on('focus click', function() {
                $(this).select();
            });
        }

        controls.push({item_ctrl, qty_ctrl});

        // Remove row button (enhanced style)
        let $del = $(`
            <button class="btn mini-pos-table-btn-danger" data-idx="${i}" type="button" title="${TEXT.REMOVE}" style="padding:4px 10px; border-radius:16px; background:linear-gradient(90deg,#f87171 0,#fbbf24 100%); color:#fff; border:none; font-size:1em;">
                <i class="fa fa-trash"></i>
            </button>
        `);
        $del_td.append($del);

        $table.find('tbody').append($row);
    });
    $('#items-table', dialog.$wrapper).html($table);
}

        if (dialog.fields_dict.txn_type && dialog.fields_dict.txn_type.$input) {
            dialog.fields_dict.txn_type.$input.find('option[value="Add Stock"]').text(TEXT.ADD_STOCK);
            dialog.fields_dict.txn_type.$input.find('option[value="Return Stock"]').text(TEXT.RETURN_STOCK);
        }

        dialog.show();
        render_items_table();

        // Add Row handler
        dialog.$wrapper.on('click', '#add-row-btn', function() {
            item_rows.push({item_code:'', qty:1, item_name:''});
            render_items_table();
        });
        // Remove Row handler
        dialog.$wrapper.on('click', '.mini-pos-table-btn-danger', function() {
            let idx = $(this).data('idx');
            item_rows.splice(idx, 1);
            render_items_table();
        });

    });
    
    // --- PAYMENT BUTTON LOGIC ---
    $(wrapper).on("click", "#mini-pos-payment-btn", async function() {
        let customer_label = $("#mini-pos-customer").val();
        let customer = findValue(customers, customer_label);

        let mode_of_payment = ensureModeSelectionValid({ syncStorage: true });
        console.log("Payment Mode Selected:", mode_of_payment);

        if (!customer) {
            showMsg(TEXT.PLEASE_SELECT_CUSTOMER, "error");
            return;
        }
        if (!mode_of_payment) {
            showMsg(TEXT.PAYMENT_MODE_REQUIRED, "error");
            return;
        }

        let paymentDialog = new frappe.ui.Dialog({
            title: '<i class="fa fa-money"></i> دفعة العميل',
            fields: [
                {
                    fieldtype: 'HTML',
                    fieldname: 'payment_header',
                    options: `
                        <div style="background: linear-gradient(135deg, #f59e42 0%, #fcd34d 100%);
                                    color: white;
                                    padding: 15px 20px;
                                    border-radius: 12px;
                                    margin-bottom: 20px;
                                    text-align: center;">
                            <i class="fa fa-exchange" style="font-size: 2em; margin-bottom: 8px;"></i>
                            <div style="font-size: 1.1em; font-weight: 600;">تسجيل دفعة للعميل: ${customer_label}</div>
                        </div>
                    `
                },
                {
                    fieldtype: 'HTML',
                    fieldname: 'payment_type_selector',
                    options: `
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151;">نوع العملية <span style="color: #ef4444;">*</span></label>
                            <div style="display: flex; gap: 10px; direction: rtl;">
                                <label style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 12px 16px; border: 2px solid #10b981; border-radius: 10px; cursor: pointer; background: #f0fdf4; transition: all 0.2s;" id="payment-type-receive-label">
                                    <input type="radio" name="payment_type_radio" value="Receive" checked style="margin-left: 8px; accent-color: #10b981;">
                                    <i class="fa fa-arrow-down" style="margin-left: 6px; color: #10b981;"></i>
                                    <span style="font-weight: 600; color: #166534;">استلام من العميل</span>
                                </label>
                                <label style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 12px 16px; border: 2px solid #d1d5db; border-radius: 10px; cursor: pointer; background: #fff; transition: all 0.2s;" id="payment-type-pay-label">
                                    <input type="radio" name="payment_type_radio" value="Pay" style="margin-left: 8px; accent-color: #ef4444;">
                                    <i class="fa fa-arrow-up" style="margin-left: 6px; color: #6b7280;"></i>
                                    <span style="font-weight: 600; color: #374151;">دفع للعميل</span>
                                </label>
                            </div>
                        </div>
                    `
                },
                {
                    fieldtype: "Currency",
                    label: TEXT.AMOUNT,
                    fieldname: "amount",
                    reqd: 1,
                    precision: 2
                },
                {
                    fieldtype: "Small Text",
                    fieldname: "remarks",
                    label: "ملاحظات"
                }
            ],
            primary_action_label: '<i class="fa fa-check"></i> تسجيل الدفعة',
            primary_action: async function(values) {
                let amount = values.amount;
                let remarks = values.remarks || '';

                // Get payment type from radio button
                let payment_type = paymentDialog.$wrapper.find('input[name="payment_type_radio"]:checked').val() || 'Receive';
                let payment_type_label = payment_type === 'Receive' ? 'استلام من العميل' : 'دفع للعميل';

                if (!amount || parseFloat(amount) <= 0) {
                    showStyledError('تنبيه', TEXT.VALID_AMOUNT);
                    return;
                }

                // Show confirmation
                const formattedAmount = Number(amount).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
                const typeLabel = payment_type_label;
                const typeColor = payment_type === 'Receive' ? '#10b981' : '#ef4444';

                // Payment confirmation with large buttons
                let confirmPaymentDialog = new frappe.ui.Dialog({
                    title: '',
                    fields: [{
                        fieldtype: 'HTML',
                        fieldname: 'content',
                        options: `
                            <div style="text-align: center; padding: 20px;">
                                <i class="fa fa-credit-card" style="font-size: 4em; color: #3b82f6; margin-bottom: 20px; display: block;"></i>
                                <h3 style="font-weight: 700; margin-bottom: 12px; font-size: 1.4em;">تأكيد الدفعة</h3>
                                <div style="direction: rtl; text-align: right; margin-bottom: 20px;">
                                    <div style="background: #f8fafc; border-radius: 12px; padding: 15px; border: 1px solid #e2e8f0;">
                                        <table style="width: 100%; border-collapse: collapse;">
                                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                                <td style="padding: 10px 5px; color: #64748b; font-weight: 500;">
                                                    <i class="fa fa-user"></i> العميل
                                                </td>
                                                <td style="padding: 10px 5px; font-weight: 700; color: #1e293b;">
                                                    ${customer_label}
                                                </td>
                                            </tr>
                                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                                <td style="padding: 10px 5px; color: #64748b; font-weight: 500;">
                                                    <i class="fa fa-exchange"></i> نوع العملية
                                                </td>
                                                <td style="padding: 10px 5px; font-weight: 700; color: ${typeColor};">
                                                    ${typeLabel}
                                                </td>
                                            </tr>
                                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                                <td style="padding: 10px 5px; color: #64748b; font-weight: 500;">
                                                    <i class="fa fa-money"></i> المبلغ
                                                </td>
                                                <td style="padding: 10px 5px; font-weight: 700; color: #1e293b; font-size: 1.2em;">
                                                    ${formattedAmount}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px 5px; color: #64748b; font-weight: 500;">
                                                    <i class="fa fa-credit-card"></i> طريقة الدفع
                                                </td>
                                                <td style="padding: 10px 5px; font-weight: 600; color: #1e293b;">
                                                    ${mode_of_payment}
                                                </td>
                                            </tr>
                                        </table>
                                    </div>
                                </div>
                                <p style="color: #64748b; margin-bottom: 25px; font-size: 1.1em;">هل أنت متأكد من تسجيل هذه الدفعة؟</p>
                                <div style="display: flex; gap: 15px; justify-content: center;">
                                    <button type="button" class="btn confirm-yes-btn" style="
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
                                    <button type="button" class="btn confirm-no-btn" style="
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
                confirmPaymentDialog.$wrapper.find('.modal-header').hide();
                confirmPaymentDialog.$wrapper.find('.modal-footer').hide();
                confirmPaymentDialog.$wrapper.find('.modal-content').css('border-radius', '20px');
                confirmPaymentDialog.$wrapper.find('.confirm-yes-btn').on('click', async function() {
                    confirmPaymentDialog.hide();
                    paymentDialog.disable_primary_action();
                    try {
                        let r = await frappe.call({
                            method: "mobile_pos.mobile_pos.page.mini_pos.api.mini_pos_make_payment",
                            type: "POST",
                            args: {
                                customer: customer,
                                amount: amount,
                                mode_of_payment: mode_of_payment,
                                payment_type: payment_type,
                                remarks: remarks
                            }
                        });
                        paymentDialog.hide();

                        // Show success popup
                        let successDialog = new frappe.ui.Dialog({
                            title: '',
                            fields: [{
                                fieldtype: 'HTML',
                                fieldname: 'success_content',
                                options: `
                                    <div style="text-align: center; padding: 20px;">
                                        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                                                    width: 80px;
                                                    height: 80px;
                                                    border-radius: 50%;
                                                    margin: 0 auto 20px;
                                                    display: flex;
                                                    align-items: center;
                                                    justify-content: center;">
                                            <i class="fa fa-check" style="font-size: 2.5em; color: white;"></i>
                                        </div>
                                        <h3 style="color: #10b981; margin-bottom: 10px; font-weight: 700;">
                                            تم تسجيل الدفعة بنجاح!
                                        </h3>
                                        <div style="background: #f0fdf4;
                                                    border-radius: 12px;
                                                    padding: 15px;
                                                    margin: 15px 0;
                                                    border: 1px solid #bbf7d0;">
                                            <div style="color: #166534; font-weight: 600; font-size: 1.1em;">
                                                ${r.message.name}
                                            </div>
                                            <div style="color: #15803d; margin-top: 8px;">
                                                ${typeLabel} - <span style="font-weight: 700;">${formattedAmount}</span>
                                            </div>
                                        </div>
                                    </div>
                                `
                            }],
                            primary_action_label: '<i class="fa fa-check"></i> حسناً',
                            primary_action: function() {
                                successDialog.hide();
                            }
                        });
                        successDialog.$wrapper.find('.modal-dialog').css({'max-width': '380px'});
                        successDialog.$wrapper.find('.modal-content').css({'border-radius': '20px', 'overflow': 'hidden'});
                        successDialog.$wrapper.find('.modal-header').hide();
                        successDialog.$wrapper.find('.btn-primary').css({
                            'background': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            'border': 'none',
                            'border-radius': '10px',
                            'padding': '12px 40px',
                            'font-weight': '600',
                            'width': '100%'
                        });
                        successDialog.show();
                        setTimeout(() => {
                            if (successDialog.$wrapper.is(':visible')) {
                                successDialog.hide();
                            }
                        }, 3000);
                    } catch (e) {
                        showStyledError('خطأ', e.message || TEXT.PAYMENT_FAILED);
                        paymentDialog.enable_primary_action();
                    }
                });
                confirmPaymentDialog.$wrapper.find('.confirm-no-btn').on('click', function() {
                    confirmPaymentDialog.hide();
                });
                confirmPaymentDialog.show();
            },
            secondary_action_label: '<i class="fa fa-times"></i> إلغاء',
            secondary_action: function() {
                paymentDialog.hide();
            }
        });

        // Style the dialog
        paymentDialog.$wrapper.find('.modal-dialog').css({'max-width': '420px'});
        paymentDialog.$wrapper.find('.modal-content').css({'border-radius': '16px', 'overflow': 'visible'});
        paymentDialog.$wrapper.find('.modal-body').css({'overflow': 'visible'});
        paymentDialog.$wrapper.find('.btn-primary').css({
            'background': 'linear-gradient(135deg, #f59e42 0%, #fcd34d 100%)',
            'border': 'none',
            'border-radius': '10px',
            'padding': '10px 24px',
            'font-weight': '600'
        });
        paymentDialog.$wrapper.find('.btn-secondary, .btn-default').css({
            'border-radius': '10px',
            'padding': '10px 24px'
        });

        // Handle radio button selection styling
        paymentDialog.$wrapper.on('change', 'input[name="payment_type_radio"]', function() {
            let val = $(this).val();
            let receiveLabel = paymentDialog.$wrapper.find('#payment-type-receive-label');
            let payLabel = paymentDialog.$wrapper.find('#payment-type-pay-label');

            if (val === 'Receive') {
                receiveLabel.css({
                    'border-color': '#10b981',
                    'background': '#f0fdf4'
                });
                receiveLabel.find('i').css('color', '#10b981');
                receiveLabel.find('span').css('color', '#166534');

                payLabel.css({
                    'border-color': '#d1d5db',
                    'background': '#fff'
                });
                payLabel.find('i').css('color', '#6b7280');
                payLabel.find('span').css('color', '#374151');
            } else {
                payLabel.css({
                    'border-color': '#ef4444',
                    'background': '#fef2f2'
                });
                payLabel.find('i').css('color', '#ef4444');
                payLabel.find('span').css('color', '#991b1b');

                receiveLabel.css({
                    'border-color': '#d1d5db',
                    'background': '#fff'
                });
                receiveLabel.find('i').css('color', '#6b7280');
                receiveLabel.find('span').css('color', '#374151');
            }
        });

        paymentDialog.show();
    });

    // --- DISCOUNT BUTTON LOGIC ---
    $(wrapper).on("click", "#mini-pos-discount-btn", async function() {
        let customer_label = $("#mini-pos-customer").val();
        let customer = findValue(customers, customer_label);

        if (!customer) {
            showMsg(TEXT.PLEASE_SELECT_CUSTOMER, "error");
            return;
        }

        // Fetch discount types first
        let discountTypes = [];
        try {
            let res = await frappe.call({
                method: "mobile_pos.mobile_pos.page.mini_pos.api.mini_pos_get_discount_types"
            });
            discountTypes = res.message || [];
        } catch (e) {
            showStyledError('خطأ', TEXT.NO_DISCOUNT_TYPES);
            return;
        }

        if (!discountTypes.length) {
            showStyledError('تنبيه', TEXT.NO_DISCOUNT_TYPES, 'warning');
            return;
        }

        // Build discount type cards for dropdown
        let discountTypeCards = discountTypes.map(dt =>
            `<div class="discount-type-card" data-value="${escape_html(dt.name)}" data-label="${escape_html(dt.discount_type_name)}" style="
                padding: 12px 15px;
                border: 2px solid #e5e7eb;
                border-radius: 10px;
                cursor: pointer;
                text-align: center;
                background: #fff;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                min-height: 50px;
            ">
                <i class="fa fa-tag" style="font-size: 1.1em; color: #9ca3af;"></i>
                <span style="font-size: 15px; font-weight: 600; color: #374151;">${escape_html(dt.discount_type_name)}</span>
            </div>`
        ).join('');

        let discountDialog = new frappe.ui.Dialog({
            title: '<i class="fa fa-percent"></i> ' + TEXT.CUSTOMER_DISCOUNT,
            fields: [
                {
                    fieldtype: 'HTML',
                    fieldname: 'discount_header',
                    options: `
                        <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%);
                                    color: white;
                                    padding: 15px 20px;
                                    border-radius: 12px;
                                    margin-bottom: 20px;
                                    text-align: center;">
                            <i class="fa fa-percent" style="font-size: 2em; margin-bottom: 8px;"></i>
                            <div style="font-size: 1.1em; font-weight: 600;">تسجيل خصم للعميل: ${customer_label}</div>
                        </div>
                    `
                },
                {
                    fieldtype: 'HTML',
                    fieldname: 'discount_type_html',
                    options: `
                        <div class="form-group" style="margin-bottom: 20px; position: relative;">
                            <label class="control-label" style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151; font-size: 13px;">
                                ${TEXT.DISCOUNT_TYPE} <span style="color: #ef4444;">*</span>
                            </label>
                            <div id="discount-type-trigger" style="
                                width: 100%;
                                padding: 12px 15px;
                                border: 1px solid #d1d5db;
                                border-radius: 8px;
                                font-size: 15px;
                                font-weight: 500;
                                background: #fff;
                                color: #9ca3af;
                                cursor: pointer;
                                display: flex;
                                align-items: center;
                                justify-content: space-between;
                                direction: rtl;
                            ">
                                <span id="discount-type-display">${TEXT.SELECT_DISCOUNT_TYPE}</span>
                                <i class="fa fa-chevron-down" style="font-size: 12px; color: #9ca3af;"></i>
                            </div>
                            <div id="discount-type-dropdown" style="
                                display: none;
                                position: absolute;
                                top: 100%;
                                left: 0;
                                right: 0;
                                background: #fff;
                                border: 1px solid #e5e7eb;
                                border-radius: 12px;
                                box-shadow: 0 10px 40px rgba(0,0,0,0.15);
                                z-index: 1000;
                                padding: 10px;
                                margin-top: 5px;
                                max-height: 250px;
                                overflow-y: auto;
                            ">
                                <div style="
                                    display: flex;
                                    flex-direction: column;
                                    gap: 8px;
                                ">
                                    ${discountTypeCards}
                                </div>
                            </div>
                            <input type="hidden" id="discount-type-select" value="">
                            <input type="hidden" id="discount-type-label" value="">
                        </div>
                    `
                },
                {
                    fieldtype: 'HTML',
                    fieldname: 'amount_html',
                    options: `
                        <div class="form-group" style="margin-bottom: 15px;">
                            <label class="control-label" style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151; font-size: 13px;">
                                ${TEXT.DISCOUNT_AMOUNT} <span style="color: #ef4444;">*</span>
                            </label>
                            <input type="number" id="discount-amount-input" inputmode="decimal" placeholder="0.00" step="0.01" min="0" style="
                                width: 100%;
                                padding: 12px 15px;
                                border: 1px solid #d1d5db;
                                border-radius: 8px;
                                font-size: 24px;
                                font-weight: 700;
                                text-align: center;
                                direction: ltr;
                                background: #fff;
                                color: #1e293b;
                            ">
                        </div>
                    `
                },
                {
                    fieldtype: 'HTML',
                    fieldname: 'remarks_html',
                    options: `
                        <div class="form-group" style="margin-bottom: 15px;">
                            <label class="control-label" style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151; font-size: 13px;">
                                ${TEXT.DISCOUNT_REMARKS}
                            </label>
                            <textarea id="discount-remarks-input" rows="3" style="
                                width: 100%;
                                padding: 12px 15px;
                                border: 1px solid #d1d5db;
                                border-radius: 8px;
                                font-size: 14px;
                                background: #fff;
                                resize: vertical;
                                direction: rtl;
                            "></textarea>
                        </div>
                    `
                }
            ],
            primary_action_label: '<i class="fa fa-check"></i> تسجيل الخصم',
            primary_action: async function() {
                let discount_type = discountDialog.$wrapper.find('#discount-type-select').val();
                let amount = discountDialog.$wrapper.find('#discount-amount-input').val();
                let remarks = discountDialog.$wrapper.find('#discount-remarks-input').val() || '';

                if (!discount_type) {
                    showStyledError('تنبيه', TEXT.SELECT_DISCOUNT_TYPE);
                    return;
                }

                if (!amount || parseFloat(amount) <= 0) {
                    showStyledError('تنبيه', TEXT.VALID_AMOUNT);
                    return;
                }

                // Get selected discount type name for display
                let selectedOption = discountDialog.$wrapper.find('#discount-type-label').val() || discount_type;
                const formattedAmount = Number(amount).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });

                // Show confirmation dialog
                let confirmDiscountDialog = new frappe.ui.Dialog({
                    title: '',
                    fields: [{
                        fieldtype: 'HTML',
                        fieldname: 'content',
                        options: `
                            <div style="text-align: center; padding: 20px;">
                                <i class="fa fa-percent" style="font-size: 4em; color: #059669; margin-bottom: 20px; display: block;"></i>
                                <h3 style="font-weight: 700; margin-bottom: 12px; font-size: 1.4em;">${TEXT.CONFIRM_DISCOUNT}</h3>
                                <div style="direction: rtl; text-align: right; margin-bottom: 20px;">
                                    <div style="background: #f8fafc; border-radius: 12px; padding: 15px; border: 1px solid #e2e8f0;">
                                        <table style="width: 100%; border-collapse: collapse;">
                                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                                <td style="padding: 10px 5px; color: #64748b; font-weight: 500;">
                                                    <i class="fa fa-user"></i> العميل
                                                </td>
                                                <td style="padding: 10px 5px; font-weight: 700; color: #1e293b;">
                                                    ${customer_label}
                                                </td>
                                            </tr>
                                            <tr style="border-bottom: 1px solid #e2e8f0;">
                                                <td style="padding: 10px 5px; color: #64748b; font-weight: 500;">
                                                    <i class="fa fa-tag"></i> ${TEXT.DISCOUNT_TYPE}
                                                </td>
                                                <td style="padding: 10px 5px; font-weight: 700; color: #059669;">
                                                    ${selectedOption}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px 5px; color: #64748b; font-weight: 500;">
                                                    <i class="fa fa-money"></i> ${TEXT.DISCOUNT_AMOUNT}
                                                </td>
                                                <td style="padding: 10px 5px; font-weight: 700; color: #1e293b; font-size: 1.2em;">
                                                    ${formattedAmount}
                                                </td>
                                            </tr>
                                        </table>
                                    </div>
                                </div>
                                <p style="color: #64748b; margin-bottom: 25px; font-size: 1.1em;">هل أنت متأكد من تسجيل هذا الخصم؟</p>
                                <div style="display: flex; gap: 15px; justify-content: center;">
                                    <button type="button" class="btn confirm-yes-btn" style="
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
                                    <button type="button" class="btn confirm-no-btn" style="
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
                confirmDiscountDialog.$wrapper.find('.modal-header').hide();
                confirmDiscountDialog.$wrapper.find('.modal-footer').hide();
                confirmDiscountDialog.$wrapper.find('.modal-content').css('border-radius', '20px');
                confirmDiscountDialog.$wrapper.find('.confirm-yes-btn').on('click', async function() {
                    confirmDiscountDialog.hide();
                    discountDialog.disable_primary_action();
                    try {
                        let r = await frappe.call({
                            method: "mobile_pos.mobile_pos.page.mini_pos.api.mini_pos_create_customer_discount",
                            type: "POST",
                            args: {
                                customer: customer,
                                discount_type: discount_type,
                                amount: amount,
                                remarks: remarks
                            }
                        });
                        discountDialog.hide();

                        // Show success popup
                        let successDialog = new frappe.ui.Dialog({
                            title: '',
                            fields: [{
                                fieldtype: 'HTML',
                                fieldname: 'success_content',
                                options: `
                                    <div style="text-align: center; padding: 20px;">
                                        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                                                    width: 80px;
                                                    height: 80px;
                                                    border-radius: 50%;
                                                    margin: 0 auto 20px;
                                                    display: flex;
                                                    align-items: center;
                                                    justify-content: center;">
                                            <i class="fa fa-check" style="font-size: 2.5em; color: white;"></i>
                                        </div>
                                        <h3 style="color: #10b981; margin-bottom: 10px; font-weight: 700;">
                                            تم تسجيل الخصم بنجاح!
                                        </h3>
                                        <div style="background: #f0fdf4;
                                                    border-radius: 12px;
                                                    padding: 15px;
                                                    margin: 15px 0;
                                                    border: 1px solid #bbf7d0;">
                                            <div style="color: #166534; font-weight: 600; font-size: 1.1em;">
                                                ${r.message.name}
                                            </div>
                                            <div style="color: #15803d; margin-top: 8px;">
                                                ${selectedOption} - <span style="font-weight: 700;">${formattedAmount}</span>
                                            </div>
                                        </div>
                                    </div>
                                `
                            }],
                            primary_action_label: '<i class="fa fa-check"></i> حسناً',
                            primary_action: function() {
                                successDialog.hide();
                            }
                        });
                        successDialog.$wrapper.find('.modal-dialog').css({'max-width': '380px'});
                        successDialog.$wrapper.find('.modal-content').css({'border-radius': '20px', 'overflow': 'hidden'});
                        successDialog.$wrapper.find('.modal-header').hide();
                        successDialog.$wrapper.find('.btn-primary').css({
                            'background': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            'border': 'none',
                            'border-radius': '10px',
                            'padding': '12px 40px',
                            'font-weight': '600',
                            'width': '100%'
                        });
                        successDialog.show();
                        setTimeout(() => {
                            if (successDialog.$wrapper.is(':visible')) {
                                successDialog.hide();
                            }
                        }, 3000);
                    } catch (e) {
                        showStyledError('خطأ', e.message || TEXT.DISCOUNT_FAILED);
                        discountDialog.enable_primary_action();
                    }
                });
                confirmDiscountDialog.$wrapper.find('.confirm-no-btn').on('click', function() {
                    confirmDiscountDialog.hide();
                });
                confirmDiscountDialog.show();
            },
            secondary_action_label: '<i class="fa fa-times"></i> إلغاء',
            secondary_action: function() {
                discountDialog.hide();
            }
        });

        // Style the dialog
        discountDialog.$wrapper.find('.modal-dialog').css({'max-width': '420px'});
        discountDialog.$wrapper.find('.modal-content').css({'border-radius': '16px', 'overflow': 'visible'});
        discountDialog.$wrapper.find('.modal-body').css({'overflow': 'visible'});
        discountDialog.$wrapper.find('.btn-primary').css({
            'background': 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            'border': 'none',
            'border-radius': '10px',
            'padding': '10px 24px',
            'font-weight': '600'
        });
        discountDialog.$wrapper.find('.btn-secondary, .btn-default').css({
            'border-radius': '10px',
            'padding': '10px 24px'
        });

        // Toggle dropdown on trigger click
        discountDialog.$wrapper.on('click', '#discount-type-trigger', function(e) {
            e.stopPropagation();
            let $dropdown = discountDialog.$wrapper.find('#discount-type-dropdown');
            let $trigger = $(this);
            let isVisible = $dropdown.is(':visible');

            if (isVisible) {
                $dropdown.slideUp(150);
                $trigger.find('.fa-chevron-down').css('transform', 'rotate(0deg)');
            } else {
                $dropdown.slideDown(150);
                $trigger.find('.fa-chevron-down').css('transform', 'rotate(180deg)');
            }
        });

        // Handle discount type card selection
        discountDialog.$wrapper.on('click', '.discount-type-card', function(e) {
            e.stopPropagation();
            let $card = $(this);
            let value = $card.data('value');
            let label = $card.data('label');

            // Update hidden inputs
            discountDialog.$wrapper.find('#discount-type-select').val(value);
            discountDialog.$wrapper.find('#discount-type-label').val(label);

            // Update trigger display
            discountDialog.$wrapper.find('#discount-type-display').text(label).css('color', '#374151');
            discountDialog.$wrapper.find('#discount-type-trigger').css('border-color', '#059669');

            // Reset all cards
            discountDialog.$wrapper.find('.discount-type-card').css({
                'border-color': '#e5e7eb',
                'background': '#fff'
            });
            discountDialog.$wrapper.find('.discount-type-card .fa-tag').css('color', '#9ca3af');
            discountDialog.$wrapper.find('.discount-type-card span').css('color', '#374151');

            // Mark selected card
            $card.css({
                'border-color': '#059669',
                'background': 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
            });
            $card.find('.fa-tag').css('color', '#059669');
            $card.find('span').css('color', '#065f46');

            // Close dropdown
            discountDialog.$wrapper.find('#discount-type-dropdown').slideUp(150);
            discountDialog.$wrapper.find('#discount-type-trigger .fa-chevron-down').css('transform', 'rotate(0deg)');
        });

        // Hover effect on cards
        discountDialog.$wrapper.on('mouseenter', '.discount-type-card', function() {
            let $card = $(this);
            if (discountDialog.$wrapper.find('#discount-type-select').val() !== $card.data('value')) {
                $card.css({
                    'background': '#f9fafb',
                    'border-color': '#d1d5db'
                });
            }
        });
        discountDialog.$wrapper.on('mouseleave', '.discount-type-card', function() {
            let $card = $(this);
            if (discountDialog.$wrapper.find('#discount-type-select').val() !== $card.data('value')) {
                $card.css({
                    'background': '#fff',
                    'border-color': '#e5e7eb'
                });
            }
        });

        // Close dropdown when clicking outside
        $(document).on('click.discountDropdown', function(e) {
            if (!$(e.target).closest('#discount-type-trigger, #discount-type-dropdown').length) {
                discountDialog.$wrapper.find('#discount-type-dropdown').slideUp(150);
                discountDialog.$wrapper.find('#discount-type-trigger .fa-chevron-down').css('transform', 'rotate(0deg)');
            }
        });

        // Cleanup on dialog hide
        discountDialog.$wrapper.on('hidden.bs.modal', function() {
            $(document).off('click.discountDropdown');
        });

        // Handle numpad clicks for discount amount
        discountDialog.$wrapper.on('click', '.discount-numpad-btn', function() {
            let btn = $(this);
            let value = btn.data('value').toString();
            let input = discountDialog.$wrapper.find('#discount-amount-input');
            let current = input.val() || '';

            if (value === 'backspace') {
                input.val(current.slice(0, -1));
            } else if (value === '.') {
                if (!current.includes('.')) {
                    input.val(current + value);
                }
            } else {
                // Limit decimal places to 2
                if (current.includes('.') && current.split('.')[1].length >= 2) {
                    return;
                }
                input.val(current + value);
            }
        });

        // Add hover effect to numpad buttons
        discountDialog.$wrapper.on('mouseenter', '.discount-numpad-btn', function() {
            let isBackspace = $(this).data('value') === 'backspace';
            $(this).css('background', isBackspace ? '#fecaca' : '#f3f4f6');
        }).on('mouseleave', '.discount-numpad-btn', function() {
            let isBackspace = $(this).data('value') === 'backspace';
            $(this).css('background', isBackspace ? '#fee2e2' : '#fff');
        });

        discountDialog.show();
    });

    // --- TOTAL USER CREDIT BUTTON LOGIC ---
    $(wrapper).on("click", "#mini-pos-total-credit-btn", async function() {
        let btn = $(this);
        btn.prop('disabled', true);
        try {
            let res = await frappe.call({
                method: "mobile_pos.mobile_pos.page.mini_pos.api.mini_pos_get_all_customers_credit"
            });
            let data = res.message || [];

            if (!data.length) {
                showStyledError('', TEXT.CREDIT_NO_DATA);
                btn.prop('disabled', false);
                return;
            }

            let totalBalance = 0;
            let rowsHtml = '';
            data.forEach((row, idx) => {
                totalBalance += row.balance;
                let balColor = row.balance > 0 ? '#dc2626' : '#10b981';
                rowsHtml += `
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 10px 8px; text-align: center; color: #6b7280;">${idx + 1}</td>
                        <td style="padding: 10px 8px; font-weight: 600; color: #1f2937;">${row.customer_name}</td>
                        <td style="padding: 10px 8px; text-align: center; font-weight: 700; color: ${balColor};">${format_number(row.balance)}</td>
                    </tr>`;
            });

            let totalColor = totalBalance > 0 ? '#dc2626' : '#10b981';

            let creditDialog = new frappe.ui.Dialog({
                title: '<i class="fa fa-credit-card"></i> ' + TEXT.TOTAL_USER_CREDIT_TITLE,
                fields: [{
                    fieldtype: 'HTML',
                    fieldname: 'credit_content',
                    options: `
                        <div style="max-height: 400px; overflow-y: auto; margin: 0 -15px; padding: 0 15px;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 0.95em;">
                                <thead>
                                    <tr style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-bottom: 2px solid #cbd5e1;">
                                        <th style="padding: 12px 8px; text-align: center; color: #475569; font-weight: 700;">#</th>
                                        <th style="padding: 12px 8px; text-align: right; color: #475569; font-weight: 700;">${TEXT.CREDIT_CUSTOMER_NAME}</th>
                                        <th style="padding: 12px 8px; text-align: center; color: #475569; font-weight: 700;">${TEXT.CREDIT_BALANCE}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rowsHtml}
                                </tbody>
                                <tfoot>
                                    <tr style="background: linear-gradient(135deg, #f0fdf4 0%, #fef3c7 100%); border-top: 2px solid #475569;">
                                        <td colspan="2" style="padding: 14px 8px; font-weight: 800; font-size: 1.1em; color: #1e293b; text-align: right;">${TEXT.CREDIT_TOTAL}</td>
                                        <td style="padding: 14px 8px; text-align: center; font-weight: 800; font-size: 1.15em; color: ${totalColor};">${format_number(totalBalance)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    `
                }],
                primary_action_label: '<i class="fa fa-times"></i> إغلاق',
                primary_action: function() {
                    creditDialog.hide();
                }
            });

            creditDialog.$wrapper.find('.modal-dialog').css({'max-width': '480px'});
            creditDialog.$wrapper.find('.modal-content').css({'border-radius': '16px', 'overflow': 'hidden'});
            creditDialog.$wrapper.find('.btn-primary').css({
                'background': 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                'border': 'none',
                'border-radius': '10px',
                'padding': '10px 24px',
                'font-weight': '600'
            });
            creditDialog.show();
        } catch (e) {
            showStyledError('خطأ', TEXT.CREDIT_FETCH_ERROR);
        }
        btn.prop('disabled', false);
    });

    // --- RETURN BUTTON LOGIC ---
$(wrapper).on("click", "#mini-pos-return-btn", async function () {
    let customer_label = $("#mini-pos-customer").val();
    let customer = findValue(customers, customer_label);
    if (!customer) {
        showMsg(TEXT.PLEASE_SELECT_CUSTOMER, "error");
        return;
    }

    // Create return dialog with item selection
    let returnItems = [];

    function renderReturnItemsTable() {
        if (returnItems.length === 0) {
            return `<div style="text-align: center; padding: 30px; color: #9ca3af;">
                <i class="fa fa-inbox" style="font-size: 2em; margin-bottom: 10px; display: block;"></i>
                لا توجد أصناف - اضغط "إضافة صنف" لإضافة أصناف المرتجع
            </div>`;
        }

        let rows = returnItems.map((item, i) => `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 10px 8px; font-weight: 500;">${escape_html(item.item_name)}</td>
                <td style="padding: 10px 8px; text-align: center;">
                    <input type="number" class="return-item-qty" data-idx="${i}" value="${Math.abs(item.qty)}" min="1" inputmode="numeric" style="
                        width: 70px;
                        padding: 8px;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        text-align: center;
                        font-weight: 600;
                    ">
                </td>
                <td style="padding: 10px 8px; text-align: center;">
                    <input type="text" class="return-item-rate" data-idx="${i}" value="${item.rate}" inputmode="decimal" style="
                        width: 90px;
                        padding: 8px;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        text-align: center;
                        font-weight: 600;
                    ">
                </td>
                <td style="padding: 10px 8px; text-align: center; font-weight: 600; color: #f43f5e;">
                    ${(Math.abs(item.qty) * item.rate).toLocaleString('en-US', {minimumFractionDigits: 2})}
                </td>
                <td style="padding: 10px 8px; text-align: center;">
                    <button type="button" class="btn btn-sm return-remove-item" data-idx="${i}" style="
                        background: #fef2f2;
                        color: #ef4444;
                        border: 1px solid #fecaca;
                        border-radius: 8px;
                        padding: 6px 10px;
                    "><i class="fa fa-trash"></i></button>
                </td>
            </tr>
        `).join('');

        let total = returnItems.reduce((sum, item) => sum + (Math.abs(item.qty) * item.rate), 0);

        return `
            <table style="width: 100%; border-collapse: collapse; direction: rtl;">
                <thead>
                    <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                        <th style="padding: 12px 8px; text-align: right; font-weight: 600; color: #64748b;">الصنف</th>
                        <th style="padding: 12px 8px; text-align: center; font-weight: 600; color: #64748b;">الكمية</th>
                        <th style="padding: 12px 8px; text-align: center; font-weight: 600; color: #64748b;">السعر</th>
                        <th style="padding: 12px 8px; text-align: center; font-weight: 600; color: #64748b;">الإجمالي</th>
                        <th style="padding: 12px 8px; text-align: center; font-weight: 600; color: #64748b;"></th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
                <tfoot>
                    <tr style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-top: 2px solid #fecaca;">
                        <td colspan="3" style="padding: 14px 8px; text-align: right; font-weight: 700; color: #991b1b;">إجمالي المرتجع:</td>
                        <td colspan="2" style="padding: 14px 8px; text-align: center; font-weight: 700; font-size: 1.2em; color: #dc2626;">
                            ${total.toLocaleString('en-US', {minimumFractionDigits: 2})}
                        </td>
                    </tr>
                </tfoot>
            </table>
        `;
    }

    let returnDialog = new frappe.ui.Dialog({
        title: '<i class="fa fa-undo" style="color: #f43f5e;"></i> إنشاء فاتورة مرتجع',
        size: 'large',
        fields: [
            {
                fieldtype: 'HTML',
                fieldname: 'header',
                options: `
                    <div style="background: linear-gradient(135deg, #f43f5e 0%, #ec4899 100%);
                                color: white;
                                padding: 15px 20px;
                                border-radius: 12px;
                                margin-bottom: 15px;
                                text-align: center;">
                        <i class="fa fa-undo" style="font-size: 1.5em; margin-bottom: 8px;"></i>
                        <div style="font-size: 1.1em; font-weight: 600;">مرتجع للعميل: ${escape_html(customer_label)}</div>
                    </div>
                `
            },
            {
                fieldtype: 'HTML',
                fieldname: 'add_item_btn',
                options: `
                    <div style="margin-bottom: 15px;">
                        <button type="button" id="return-add-item-btn" style="
                            width: 100%;
                            padding: 14px;
                            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                            color: white;
                            border: none;
                            border-radius: 12px;
                            font-size: 1.1em;
                            font-weight: 600;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 10px;
                        ">
                            <i class="fa fa-plus-circle"></i>
                            إضافة صنف للمرتجع
                        </button>
                    </div>
                `
            },
            {
                fieldtype: 'HTML',
                fieldname: 'items_table',
                options: `<div id="return-items-container" style="
                    max-height: 300px;
                    overflow-y: auto;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    margin-bottom: 15px;
                ">${renderReturnItemsTable()}</div>`
            }
        ],
        primary_action_label: '<i class="fa fa-check"></i> إنشاء المرتجع',
        primary_action: async function() {
            if (returnItems.length === 0) {
                showStyledError('تنبيه', 'يرجى إضافة صنف واحد على الأقل');
                return;
            }

            // Update quantities and rates from inputs
            returnDialog.$wrapper.find('.return-item-qty').each(function() {
                let idx = $(this).data('idx');
                let qty = parseFloat($(this).val()) || 1;
                returnItems[idx].qty = -Math.abs(qty); // negative for return
            });
            returnDialog.$wrapper.find('.return-item-rate').each(function() {
                let idx = $(this).data('idx');
                let rate = parseFloat(convertArabicToEnglishNumbers($(this).val())) || 0;
                returnItems[idx].rate = rate;
            });

            let total = returnItems.reduce((sum, item) => sum + (Math.abs(item.qty) * item.rate), 0);
            let formattedTotal = total.toLocaleString('en-US', {minimumFractionDigits: 2});

            // Show confirmation
            let confirmDialog = new frappe.ui.Dialog({
                title: '',
                fields: [{
                    fieldtype: 'HTML',
                    options: `
                        <div style="text-align: center; padding: 20px;">
                            <i class="fa fa-undo" style="font-size: 4em; color: #f43f5e; margin-bottom: 20px; display: block;"></i>
                            <h3 style="font-weight: 700; margin-bottom: 12px; font-size: 1.4em;">تأكيد المرتجع</h3>
                            <p style="color: #64748b; margin-bottom: 10px;">هل أنت متأكد من إنشاء مرتجع بقيمة:</p>
                            <p style="font-weight: 700; font-size: 1.6em; color: #f43f5e; margin-bottom: 20px;">${formattedTotal}</p>
                            <p style="color: #64748b; margin-bottom: 25px;">(${returnItems.length} صنف)</p>
                            <div style="display: flex; gap: 15px; justify-content: center;">
                                <button type="button" class="btn confirm-yes" style="
                                    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                                    color: white; border: none; padding: 16px 45px;
                                    font-size: 1.2em; font-weight: 700; border-radius: 14px;
                                    box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4);
                                ">نعم</button>
                                <button type="button" class="btn confirm-no" style="
                                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                                    color: white; border: none; padding: 16px 45px;
                                    font-size: 1.2em; font-weight: 700; border-radius: 14px;
                                    box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
                                ">لا</button>
                            </div>
                        </div>
                    `
                }]
            });
            confirmDialog.$wrapper.find('.modal-header, .modal-footer').hide();
            confirmDialog.$wrapper.find('.modal-content').css('border-radius', '20px');

            confirmDialog.$wrapper.find('.confirm-yes').on('click', async function() {
                confirmDialog.hide();
                returnDialog.disable_primary_action();

                try {
                    let items_data = returnItems.map(item => ({
                        item_code: item.item_code,
                        item_name: item.item_name,
                        qty: item.qty,
                        rate: item.rate,
                        uom: item.uom,
                        conversion_factor: item.conversion_factor || 1
                    }));

                    let r = await frappe.call({
                        method: "mobile_pos.mobile_pos.page.mini_pos.api.mini_pos_create_direct_return",
                        type: "POST",
                        args: {
                            customer: customer,
                            items: JSON.stringify(items_data)
                        }
                    });

                    if (r.message && r.message.name) {
                        returnDialog.hide();

                        // Get customer balance
                        let balance_res = await frappe.call({
                            method: "mobile_pos.mobile_pos.page.mini_pos.api.mini_pos_get_customer_balance",
                            args: { customer: customer }
                        });
                        let customer_balance = balance_res.message || 0;

                        // Print return receipt
                        printPOSReceipt(
                            r.message.name,
                            customer_label,
                            items_data.map(item => ({
                                item_code: item.item_code,
                                item_name: item.item_name,
                                qty: Math.abs(item.qty),
                                rate: item.rate
                            })),
                            total,
                            0, // no discount
                            total,
                            0, // no paid amount
                            '',
                            r.message.custom_hash,
                            true, // is return
                            customer_balance
                        );

                        location.reload();
                    } else {
                        showStyledError('خطأ', TEXT.RETURN_INVOICE_ERROR);
                        returnDialog.enable_primary_action();
                    }
                } catch (err) {
                    showStyledError('خطأ', err.message || TEXT.RETURN_INVOICE_ERROR);
                    returnDialog.enable_primary_action();
                }
            });

            confirmDialog.$wrapper.find('.confirm-no').on('click', function() {
                confirmDialog.hide();
            });

            confirmDialog.show();
        },
        secondary_action_label: '<i class="fa fa-times"></i> إلغاء',
        secondary_action: function() {
            returnDialog.hide();
        }
    });

    // Style the dialog
    returnDialog.$wrapper.find('.modal-dialog').css('max-width', '600px');
    returnDialog.$wrapper.find('.modal-content').css({'border-radius': '16px', 'overflow': 'hidden'});
    returnDialog.$wrapper.find('.btn-primary').css({
        'background': 'linear-gradient(135deg, #f43f5e 0%, #ec4899 100%)',
        'border': 'none',
        'border-radius': '10px',
        'padding': '10px 24px',
        'font-weight': '600'
    });

    // Handle add item button
    returnDialog.$wrapper.on('click', '#return-add-item-btn', function() {
        // Show item selection dialog with customer's previously bought items
        let itemSearchDialog = new frappe.ui.Dialog({
            title: '<i class="fa fa-undo"></i> اختر صنف للمرتجع (مشتريات العميل السابقة)',
            size: 'large',
            fields: [
                {
                    fieldtype: 'HTML',
                    fieldname: 'search_box',
                    options: `
                        <div style="margin-bottom: 15px;">
                            <input type="text" id="return-item-search" placeholder="بحث بالاسم أو الكود..." style="
                                width: 100%;
                                padding: 14px 16px;
                                border: 2px solid #e2e8f0;
                                border-radius: 12px;
                                font-size: 1em;
                                direction: rtl;
                            ">
                        </div>
                    `
                },
                {
                    fieldtype: 'HTML',
                    fieldname: 'items_list',
                    options: `<div id="return-item-search-results" style="
                        max-height: 450px;
                        overflow-y: auto;
                        border: 1px solid #e2e8f0;
                        border-radius: 12px;
                        background: #f8fafc;
                    "></div>`
                }
            ]
        });

        // Load items sold to this customer
        async function loadItems(searchTerm = '') {
            let $container = itemSearchDialog.$wrapper.find('#return-item-search-results');
            $container.html('<div style="text-align: center; padding: 30px; color: #9ca3af;"><i class="fa fa-spinner fa-spin"></i> جاري التحميل...</div>');

            try {
                let res = await frappe.call({
                    method: "mobile_pos.mobile_pos.page.mini_pos.api.mini_pos_get_customer_sold_items",
                    args: {
                        customer: customer,
                        search_term: searchTerm || null
                    }
                });

                let itemsList = res.message || [];

                if (itemsList.length === 0) {
                    $container.html(`<div style="text-align: center; padding: 40px; color: #9ca3af;">
                        <i class="fa fa-inbox" style="font-size: 2.5em; margin-bottom: 15px; display: block;"></i>
                        ${searchTerm ? 'لا توجد نتائج للبحث' : 'لا توجد مشتريات سابقة لهذا العميل'}
                    </div>`);
                    return;
                }

                let html = '<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 12px; direction: rtl;">';
                html += itemsList.map(item => {
                    let price = item.rate || 0;
                    return `
                        <div class="return-item-option" data-item='${JSON.stringify({
                            item_code: item.item_code,
                            item_name: item.item_name,
                            rate: price,
                            uom: item.uom
                        }).replace(/'/g, "&#39;")}' style="
                            background: white;
                            border: 2px solid #e2e8f0;
                            border-radius: 10px;
                            padding: 10px 8px;
                            cursor: pointer;
                            transition: all 0.2s ease;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            text-align: center;
                            min-height: 80px;
                            justify-content: center;
                        ">
                            <div style="
                                font-weight: 600;
                                color: #1e293b;
                                font-size: 0.8em;
                                line-height: 1.3;
                                margin-bottom: 6px;
                                display: -webkit-box;
                                -webkit-line-clamp: 2;
                                -webkit-box-orient: vertical;
                                overflow: hidden;
                                word-break: break-word;
                            ">${escape_html(item.item_name)}</div>
                            <div style="
                                font-weight: 700;
                                color: #f43f5e;
                                font-size: 0.9em;
                            ">${price.toLocaleString('en-US', {minimumFractionDigits: 2})}</div>
                        </div>
                    `;
                }).join('');
                html += '</div>';

                $container.html(html);
            } catch (e) {
                console.error('Error loading items:', e);
                $container.html('<div style="text-align: center; padding: 30px; color: #ef4444;">حدث خطأ في تحميل الأصناف</div>');
            }
        }

        // Search handler
        let searchTimeout;
        itemSearchDialog.$wrapper.on('input', '#return-item-search', function() {
            clearTimeout(searchTimeout);
            let term = $(this).val();
            searchTimeout = setTimeout(() => loadItems(term), 300);
        });

        // Item selection handler
        itemSearchDialog.$wrapper.on('click', '.return-item-option', function() {
            let itemData = JSON.parse($(this).attr('data-item'));
            returnItems.push({
                item_code: itemData.item_code,
                item_name: itemData.item_name,
                qty: -1, // negative for return
                rate: itemData.rate,
                uom: itemData.uom,
                conversion_factor: 1
            });
            itemSearchDialog.hide();
            returnDialog.$wrapper.find('#return-items-container').html(renderReturnItemsTable());
        });

        // Hover effect for cards
        itemSearchDialog.$wrapper.on('mouseenter', '.return-item-option', function() {
            $(this).css({
                'background': '#fef2f2',
                'border-color': '#f43f5e',
                'transform': 'scale(1.02)'
            });
        });
        itemSearchDialog.$wrapper.on('mouseleave', '.return-item-option', function() {
            $(this).css({
                'background': 'white',
                'border-color': '#e2e8f0',
                'transform': 'scale(1)'
            });
        });

        itemSearchDialog.show();
        // Make dialog wider to fit 4 cards properly
        itemSearchDialog.$wrapper.find('.modal-dialog').css('max-width', '700px');
        loadItems();
        setTimeout(() => itemSearchDialog.$wrapper.find('#return-item-search').focus(), 100);
    });

    // Handle remove item
    returnDialog.$wrapper.on('click', '.return-remove-item', function() {
        let idx = $(this).data('idx');
        returnItems.splice(idx, 1);
        returnDialog.$wrapper.find('#return-items-container').html(renderReturnItemsTable());
    });

    // Handle qty/rate changes
    returnDialog.$wrapper.on('input', '.return-item-qty, .return-item-rate', function() {
        let idx = $(this).data('idx');
        if ($(this).hasClass('return-item-qty')) {
            returnItems[idx].qty = -Math.abs(parseFloat($(this).val()) || 1);
        } else {
            returnItems[idx].rate = parseFloat(convertArabicToEnglishNumbers($(this).val())) || 0;
        }
        // Update total in footer
        let total = returnItems.reduce((sum, item) => sum + (Math.abs(item.qty) * item.rate), 0);
        returnDialog.$wrapper.find('tfoot td:last-child').html(total.toLocaleString('en-US', {minimumFractionDigits: 2}));
    });

    returnDialog.show();
});


$(wrapper).on('click', '#mini-pos-ledger-btn', async function() {
    let customer_label = $('#mini-pos-customer').val();
    let customer = findValue(customers, customer_label);

    // Fallback: If not found, try label itself (in case label==value)
    if (!customer && customer_label) customer = customer_label;

    if (!customer) {
        showStyledError('تنبيه', TEXT.SELECT_CUSTOMER_FIRST);
        return;
    }

    let $btn = $(this);
    $btn.prop("disabled", true);

    try {
        let res = await frappe.call({
            method: "mobile_pos.mobile_pos.page.mini_pos.api.mini_pos_ledger",
            args: { customer }
        });
        let ledger = res.message || [];
        let columns = [
            { label: TEXT.LEDGER_DATE, fieldname: "posting_date", align: "left" },
            { label: TEXT.LEDGER_TYPE, fieldname: "voucher_type", align: "left" },
            { label: TEXT.LEDGER_NO, fieldname: "voucher_no", align: "left" },
            { label: TEXT.LEDGER_DEBIT, fieldname: "debit", align: "right", fieldtype: "Currency" },
            { label: TEXT.LEDGER_CREDIT, fieldname: "credit", align: "right", fieldtype: "Currency" },
            { label: TEXT.LEDGER_BALANCE, fieldname: "balance", align: "right", fieldtype: "Currency" }
        ];
        let running_balance = 0;
        let ledgerRows = ledger.map(row => {
            running_balance += (+row.debit || 0) - (+row.credit || 0);
            return {
                posting_date: frappe.datetime.str_to_user(row.posting_date),
                voucher_type: row.voucher_type,
                voucher_no: row.voucher_no,
                debit: row.debit,
                credit: row.credit,
                balance: running_balance
            };
        });
        let dialog_id = "mini-pos-ledger-table-" + Math.floor(Math.random()*999999);
        let table = tableHtml({columns, rows: ledgerRows});
        let html = `
            <div id="${dialog_id}">
                <div style="font-weight:700;font-size:1.08em;margin-bottom:10px;">
                    ${escape_html(customer_label)} - ${TEXT.CUSTOMER_LEDGER}
                </div>
                ${table}
                <div style="margin-top:14px;text-align:right;">
                    <button type="button" class="btn btn-xs btn-primary" onclick="window.miniPosPrintLedgerTable && window.miniPosPrintLedgerTable()">
                        <i class="fa fa-print"></i> ${TEXT.PRINT}
                    </button>
                </div>
            </div>
        `;
            window.miniPosPrintLedgerTable = function() {
                printTableDialog({
                    title: TEXT.CUSTOMER_LEDGER,
                company: customer_label,
                columns,
                rows: ledgerRows
            });
        };
        frappe.msgprint({
            title: TEXT.CUSTOMER_LEDGER,
            message: html,
            indicator: 'blue'
        });
    } catch(e) {
        showStyledError('خطأ', e.message || TEXT.FETCH_LEDGER_ERROR);
    }
    $btn.prop("disabled", false);
});

// --- Invoice History Button ---
$(wrapper).on('click', '#mini-pos-invoice-history-btn', async function() {
    let customer_label = $('#mini-pos-customer').val();
    let customer = findValue(customers, customer_label);

    if (!customer && customer_label) customer = customer_label;

    if (!customer) {
        showStyledError('تنبيه', TEXT.SELECT_CUSTOMER_FIRST);
        return;
    }

    let $btn = $(this);
    $btn.prop("disabled", true);

    try {
        let res = await frappe.call({
            method: "mobile_pos.mobile_pos.page.mini_pos.api.mini_pos_customer_invoices",
            args: { customer }
        });
        let invoices = res.message || [];

        if (!invoices.length) {
            showStyledError('تنبيه', TEXT.NO_CUSTOMER_INVOICES);
            $btn.prop("disabled", false);
            return;
        }

        // Build invoice list HTML
        let invoiceListHtml = invoices.map(inv => {
            let statusColor = inv.status === 'Paid' ? '#10b981' :
                              inv.status === 'Unpaid' ? '#f59e0b' :
                              inv.status === 'Overdue' ? '#dc2626' : '#64748b';
            let isReturn = inv.is_return ? '<span style="background:#dc2626;color:white;padding:2px 6px;border-radius:4px;font-size:0.75em;margin-right:5px;">مرتجع</span>' : '';
            return `
                <div class="invoice-history-item" data-invoice="${inv.name}" style="
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    padding: 12px 15px;
                    margin-bottom: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                " onmouseover="this.style.background='#f1f5f9';this.style.borderColor='#0ea5e9';"
                   onmouseout="this.style.background='#f8fafc';this.style.borderColor='#e2e8f0';">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <div style="font-weight:700;color:#1e293b;font-size:1.05em;">
                                ${isReturn}${inv.name}
                            </div>
                            <div style="color:#64748b;font-size:0.9em;margin-top:4px;">
                                <i class="fa fa-calendar"></i> ${frappe.datetime.str_to_user(inv.posting_date)}
                                ${inv.custom_hash ? ' | <i class="fa fa-hashtag"></i> ' + inv.custom_hash : ''}
                            </div>
                        </div>
                        <div style="text-align:left;">
                            <div style="font-weight:700;color:#1e293b;font-size:1.1em;">
                                ${format_number(inv.grand_total)}
                            </div>
                            <div style="color:${statusColor};font-size:0.85em;font-weight:600;">
                                ${inv.status}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        let html = `
            <div style="max-height:400px;overflow-y:auto;padding:5px;">
                <div style="font-weight:700;font-size:1.08em;margin-bottom:15px;color:#1e293b;">
                    <i class="fa fa-user"></i> ${escape_html(customer_label)}
                </div>
                ${invoiceListHtml}
            </div>
        `;

        let d = new frappe.ui.Dialog({
            title: '<i class="fa fa-history"></i> ' + TEXT.INVOICE_HISTORY_TITLE,
            size: 'large'
        });
        d.$body.html(html);

        // Handle click on invoice item
        d.$body.find('.invoice-history-item').on('click', async function() {
            let invoiceName = $(this).data('invoice');
            d.hide();
            await showInvoiceDetails(invoiceName, customer_label);
        });

        d.show();

    } catch(e) {
        showStyledError('خطأ', e.message || TEXT.FETCH_INVOICE_HISTORY_ERROR);
    }
    $btn.prop("disabled", false);
});

// --- Show Invoice Details and Allow Reprint ---
async function showInvoiceDetails(invoiceName, customerLabel) {
    try {
        let res = await frappe.call({
            method: "mobile_pos.mobile_pos.page.mini_pos.api.mini_pos_invoice_details",
            args: { invoice_name: invoiceName }
        });
        let invoice = res.message;

        if (!invoice) {
            showStyledError('خطأ', 'لم يتم العثور على الفاتورة');
            return;
        }

        // Build items table
        let itemsHtml = invoice.items.map((item, idx) => `
            <tr>
                <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${idx + 1}</td>
                <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${escape_html(item.item_name)}</td>
                <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.qty}</td>
                <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;">${format_number(item.rate)}</td>
                <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;">${format_number(item.amount)}</td>
            </tr>
        `).join('');

        let isReturn = invoice.is_return;
        let statusColor = invoice.status === 'Paid' ? '#10b981' :
                          invoice.status === 'Unpaid' ? '#f59e0b' :
                          invoice.status === 'Overdue' ? '#dc2626' : '#64748b';
        let balanceColor = invoice.customer_balance > 0 ? '#dc2626' : '#10b981';

        let html = `
            <div style="direction:rtl;text-align:right;">
                <!-- Header -->
                <div style="background:linear-gradient(135deg,#0891b2,#06b6d4);color:white;padding:20px;border-radius:12px;margin-bottom:20px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <div style="font-size:1.3em;font-weight:700;">${invoice.name}</div>
                            <div style="opacity:0.9;margin-top:5px;">
                                ${frappe.datetime.str_to_user(invoice.posting_date)} - ${invoice.posting_time || ''}
                            </div>
                        </div>
                        <div style="text-align:left;">
                            ${isReturn ? '<span style="background:#dc2626;padding:5px 12px;border-radius:6px;">مرتجع</span>' : ''}
                            <div style="font-size:1.4em;font-weight:700;margin-top:5px;">${format_number(invoice.grand_total)}</div>
                        </div>
                    </div>
                </div>

                <!-- Customer Info -->
                <div style="background:#f8fafc;padding:15px;border-radius:10px;margin-bottom:15px;">
                    <div style="font-weight:700;margin-bottom:10px;"><i class="fa fa-user"></i> ${escape_html(invoice.customer_name)}</div>
                    <div style="display:flex;justify-content:space-between;">
                        <span>الحالة: <span style="color:${statusColor};font-weight:600;">${invoice.status}</span></span>
                        <span>رصيد العميل: <span style="color:${balanceColor};font-weight:700;">${format_number(invoice.customer_balance)}</span></span>
                    </div>
                </div>

                <!-- Items Table -->
                <table style="width:100%;border-collapse:collapse;margin-bottom:15px;">
                    <thead>
                        <tr style="background:#f1f5f9;">
                            <th style="padding:10px;text-align:right;border-bottom:2px solid #e2e8f0;">#</th>
                            <th style="padding:10px;text-align:right;border-bottom:2px solid #e2e8f0;">الصنف</th>
                            <th style="padding:10px;text-align:center;border-bottom:2px solid #e2e8f0;">الكمية</th>
                            <th style="padding:10px;text-align:center;border-bottom:2px solid #e2e8f0;">السعر</th>
                            <th style="padding:10px;text-align:center;border-bottom:2px solid #e2e8f0;">المبلغ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>

                <!-- Totals -->
                <div style="background:#f8fafc;padding:15px;border-radius:10px;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                        <span>المجموع:</span>
                        <span style="font-weight:600;">${format_number(invoice.total)}</span>
                    </div>
                    ${invoice.discount_amount > 0 ? `
                    <div style="display:flex;justify-content:space-between;margin-bottom:8px;color:#dc2626;">
                        <span>الخصم:</span>
                        <span style="font-weight:600;">-${format_number(invoice.discount_amount)}</span>
                    </div>
                    ` : ''}
                    <div style="display:flex;justify-content:space-between;padding-top:10px;border-top:2px solid #e2e8f0;font-size:1.2em;font-weight:700;">
                        <span>الإجمالي:</span>
                        <span>${format_number(invoice.grand_total)}</span>
                    </div>
                    ${invoice.paid_amount > 0 ? `
                    <div style="display:flex;justify-content:space-between;margin-top:8px;color:#10b981;">
                        <span>المدفوع:</span>
                        <span style="font-weight:600;">${format_number(invoice.paid_amount)}</span>
                    </div>
                    ` : ''}
                    ${invoice.outstanding_amount > 0 ? `
                    <div style="display:flex;justify-content:space-between;margin-top:8px;color:#f59e0b;">
                        <span>المتبقي:</span>
                        <span style="font-weight:600;">${format_number(invoice.outstanding_amount)}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;

        let d = new frappe.ui.Dialog({
            title: '<i class="fa fa-file-text-o"></i> ' + TEXT.INVOICE_DETAILS,
            size: 'large',
            primary_action_label: '<i class="fa fa-print"></i> ' + TEXT.REPRINT_INVOICE,
            primary_action: function() {
                // Reprint the invoice
                let paymentMode = invoice.payments && invoice.payments.length > 0 ? invoice.payments[0].mode_of_payment : '';
                printPOSReceipt(
                    invoice.name,
                    invoice.customer_name,
                    invoice.items,
                    invoice.total,
                    invoice.discount_amount || 0,
                    invoice.grand_total,
                    invoice.paid_amount || 0,
                    paymentMode,
                    invoice.custom_hash,
                    invoice.is_return,
                    invoice.customer_balance
                );
            }
        });
        d.$body.html(html);
        d.$wrapper.find('.btn-primary').css({
            'background': 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
            'border': 'none'
        });
        d.show();

    } catch(e) {
        showStyledError('خطأ', e.message || TEXT.LOAD_INVOICE_ERROR);
    }
}

// --- Cancel Invoice Button ---
$(wrapper).on('click', '#mini-pos-cancel-invoice-btn', async function() {
    let customer_label = $('#mini-pos-customer').val();
    let customer = findValue(customers, customer_label);

    if (!customer && customer_label) customer = customer_label;

    if (!customer) {
        showStyledError('تنبيه', TEXT.SELECT_CUSTOMER_FIRST);
        return;
    }

    let $btn = $(this);
    $btn.prop("disabled", true);

    try {
        // Fetch customer invoices
        let res = await frappe.call({
            method: "mobile_pos.mobile_pos.page.mini_pos.api.mini_pos_get_customer_invoices",
            args: { customer }
        });

        let invoices = res.message || [];

        if (invoices.length === 0) {
            showStyledError('تنبيه', TEXT.NO_INVOICES_TO_CANCEL);
            $btn.prop("disabled", false);
            return;
        }

        // Show dialog to select invoice to cancel
        invoicePickerDialog(
            invoices,
            async (selected_invoice) => {
                try {
                    // Confirm before canceling with large buttons
                    let cancelInvoiceDialog = new frappe.ui.Dialog({
                        title: '',
                        fields: [{
                            fieldtype: 'HTML',
                            fieldname: 'content',
                            options: `
                                <div style="text-align: center; padding: 20px;">
                                    <i class="fa fa-ban" style="font-size: 4em; color: #dc2626; margin-bottom: 20px; display: block;"></i>
                                    <h3 style="font-weight: 700; margin-bottom: 12px; font-size: 1.4em;">إلغاء فاتورة</h3>
                                    <p style="color: #64748b; margin-bottom: 10px; font-size: 1.1em;">هل أنت متأكد من إلغاء الفاتورة:</p>
                                    <p style="font-weight: 700; font-size: 1.2em; color: #dc2626; margin-bottom: 15px;">${selected_invoice}</p>
                                    <p style="color: #ef4444; font-size: 1em; margin-bottom: 25px;">⚠️ هذا الإجراء لا يمكن التراجع عنه</p>
                                    <div style="display: flex; gap: 15px; justify-content: center;">
                                        <button type="button" class="btn confirm-yes-btn" style="
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
                                        <button type="button" class="btn confirm-no-btn" style="
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
                    cancelInvoiceDialog.$wrapper.find('.modal-header').hide();
                    cancelInvoiceDialog.$wrapper.find('.modal-footer').hide();
                    cancelInvoiceDialog.$wrapper.find('.modal-content').css('border-radius', '20px');
                    cancelInvoiceDialog.$wrapper.find('.confirm-yes-btn').on('click', async function() {
                        cancelInvoiceDialog.hide();
                        try {
                            let cancel_res = await frappe.call({
                                method: "mobile_pos.mobile_pos.page.mini_pos.api.mini_pos_cancel_invoice",
                                args: { invoice_name: selected_invoice }
                            });

                            if (cancel_res.message && cancel_res.message.status === "success") {
                                // Show styled success message
                                let successDialog = new frappe.ui.Dialog({
                                    title: '',
                                    fields: [{
                                        fieldtype: 'HTML',
                                        options: `
                                            <div style="text-align: center; padding: 20px;">
                                                <div style="width: 60px; height: 60px; margin: 0 auto 15px; background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                                    <i class="fa fa-check" style="font-size: 28px; color: #16a34a;"></i>
                                                </div>
                                                <h4 style="margin: 0 0 10px; font-size: 18px; font-weight: 700; color: #16a34a;">تم بنجاح</h4>
                                                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin-bottom: 15px;">
                                                    <p style="margin: 0; font-size: 15px; color: #166534; direction: rtl;">${TEXT.INVOICE_CANCELLED(selected_invoice)}</p>
                                                </div>
                                            </div>
                                        `
                                    }]
                                });
                                successDialog.$wrapper.find('.modal-dialog').css({'max-width': '380px'});
                                successDialog.$wrapper.find('.modal-content').css({'border-radius': '16px'});
                                successDialog.$wrapper.find('.modal-header').hide();
                                successDialog.show();
                                setTimeout(() => {
                                    successDialog.hide();
                                    location.reload();
                                }, 2000);
                            } else if (cancel_res.message && cancel_res.message.status === "already_cancelled") {
                                showStyledError('تنبيه', 'الفاتورة ملغاة بالفعل', 'warning');
                            }
                        } catch (err) {
                            showStyledError('خطأ', err.message || TEXT.CANCEL_INVOICE_FAILED);
                        }
                    });
                    cancelInvoiceDialog.$wrapper.find('.confirm-no-btn').on('click', function() {
                        cancelInvoiceDialog.hide();
                    });
                    cancelInvoiceDialog.show();
                } catch (err) {
                    showStyledError('خطأ', err.message || TEXT.CANCEL_INVOICE_FAILED);
                }
            },
            TEXT.SELECT_INVOICE_TO_CANCEL
        );
    } catch (e) {
        showStyledError('خطأ', e.message || 'خطأ في تحميل الفواتير');
    }
    $btn.prop("disabled", false);
});

// --- Customer Orders Button ---
$(wrapper).on('click', '#mini-pos-customer-orders-btn', function() {
    openCustomerOrdersDialog();
});

// Customer Orders Dialog and Functions
let customerOrdersGroupBy = 'item';
let customerOrdersData = null;

function openCustomerOrdersDialog() {
    const today = frappe.datetime.get_today();

    let d = new frappe.ui.Dialog({
        title: 'طلبات العملاء',
        fields: [
            {
                fieldtype: 'Date',
                fieldname: 'delivery_date',
                label: 'تاريخ التسليم',
                default: today,
                reqd: 1
            },
            {
                fieldtype: 'HTML',
                fieldname: 'group_by_buttons'
            },
            {
                fieldtype: 'HTML',
                fieldname: 'orders_content'
            }
        ],
        primary_action_label: 'عرض الطلبات',
        primary_action: function() {
            fetchCustomerOrdersForDialog(d);
        }
    });

    // Add group by buttons
    let groupByHtml = `
        <div style="margin-bottom: 16px;">
            <label style="font-weight: 600; display: block; margin-bottom: 8px;">طريقة العرض</label>
            <div style="display: flex; gap: 8px;">
                <button type="button" id="group-by-item-btn" class="btn btn-primary btn-sm" style="flex: 1;">
                    <i class="fa fa-cube"></i> حسب الصنف
                </button>
                <button type="button" id="group-by-customer-btn" class="btn btn-default btn-sm" style="flex: 1;">
                    <i class="fa fa-users"></i> حسب العميل
                </button>
            </div>
        </div>
    `;
    d.fields_dict.group_by_buttons.$wrapper.html(groupByHtml);

    // Set up group by button handlers
    d.$wrapper.on('click', '#group-by-item-btn', function() {
        customerOrdersGroupBy = 'item';
        $(this).removeClass('btn-default').addClass('btn-primary');
        d.$wrapper.find('#group-by-customer-btn').removeClass('btn-primary').addClass('btn-default');
        if (customerOrdersData) {
            displayOrdersInDialog(d, customerOrdersData);
        }
    });

    d.$wrapper.on('click', '#group-by-customer-btn', function() {
        customerOrdersGroupBy = 'customer';
        $(this).removeClass('btn-default').addClass('btn-primary');
        d.$wrapper.find('#group-by-item-btn').removeClass('btn-primary').addClass('btn-default');
        if (customerOrdersData) {
            displayOrdersInDialog(d, customerOrdersData);
        }
    });

    d.show();

    // Auto-fetch when date changes
    d.fields_dict.delivery_date.$input.on('change', function() {
        fetchCustomerOrdersForDialog(d);
    });
}

async function fetchCustomerOrdersForDialog(dialog) {
    const deliveryDate = dialog.get_value('delivery_date');

    if (!deliveryDate) {
        showStyledError('تنبيه', 'الرجاء اختيار تاريخ التسليم');
        return;
    }

    dialog.fields_dict.orders_content.$wrapper.html(`
        <div style="text-align: center; padding: 20px;">
            <i class="fa fa-spinner fa-spin" style="font-size: 2rem; color: #667eea;"></i>
            <p style="margin-top: 10px;">جاري التحميل...</p>
        </div>
    `);

    try {
        const response = await frappe.call({
            method: 'mobile_pos.api.get_customer_orders',
            args: {
                date: deliveryDate,
                group_by: customerOrdersGroupBy
            }
        });

        const result = response.message || response;

        if (result.success) {
            customerOrdersData = result;
            displayOrdersInDialog(dialog, result);
        } else {
            dialog.fields_dict.orders_content.$wrapper.html(`
                <div style="color: #ef4444; padding: 15px; background: #fef2f2; border-radius: 8px; text-align: center;">
                    ${result.message || 'حدث خطأ أثناء جلب البيانات'}
                </div>
            `);
        }

    } catch (error) {
        console.error('Error fetching orders:', error);
        dialog.fields_dict.orders_content.$wrapper.html(`
            <div style="color: #ef4444; padding: 15px; background: #fef2f2; border-radius: 8px; text-align: center;">
                حدث خطأ في الاتصال بالخادم
            </div>
        `);
    }
}

function displayOrdersInDialog(dialog, data) {
    let html = '';

    if (customerOrdersGroupBy === 'item') {
        html = displayOrdersByItem(data);
    } else {
        html = displayOrdersByCustomer(data);
    }

    // Add print and load buttons - bigger and more visible
    html = `
        <div style="display: flex; gap: 12px; margin-bottom: 16px;">
            <button type="button" id="load-orders-btn" class="btn" style="flex: 1; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; padding: 14px 20px; font-size: 1.1rem; font-weight: 700; border-radius: 10px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                <i class="fa fa-truck" style="margin-left: 8px;"></i> تحميل
            </button>
            <button type="button" id="print-orders-btn" class="btn" style="flex: 1; background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); color: white; border: none; padding: 14px 20px; font-size: 1.1rem; font-weight: 700; border-radius: 10px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);">
                <i class="fa fa-print" style="margin-left: 8px;"></i> طباعة
            </button>
        </div>
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); border-radius: 8px; padding: 10px; margin-bottom: 12px;">
            <h4 style="margin: 0; font-size: 1rem; color: white; text-align: center;">النتائج</h4>
        </div>
        <div style="max-height: 350px; overflow-y: auto;">
            ${html}
        </div>
    `;

    dialog.fields_dict.orders_content.$wrapper.html(html);

    // Set up print button handler
    dialog.$wrapper.on('click', '#print-orders-btn', function() {
        printCustomerOrders(dialog.get_value('delivery_date'));
    });

    // Set up load button handler (create stock transfer)
    dialog.$wrapper.on('click', '#load-orders-btn', async function() {
        const deliveryDate = dialog.get_value('delivery_date');
        const $btn = $(this);

        if (!deliveryDate) {
            showStyledAlert('الرجاء اختيار تاريخ التسليم', 'warning');
            return;
        }

        // Confirm before creating stock transfer
        showStyledConfirm({
            icon: 'fa-truck',
            iconColor: '#10b981',
            title: 'تحميل البضاعة',
            message: 'سيتم إنشاء حركة مخزون لنقل البضاعة من المستودع الرئيسي إلى مستودعك',
            detail: `تاريخ التسليم: ${deliveryDate}`,
            confirmText: 'تأكيد التحميل',
            confirmColor: '#10b981',
            onConfirm: async function() {
                $btn.prop('disabled', true);
                $btn.html('<i class="fa fa-spinner fa-spin"></i> جاري التحميل...');

                try {
                    const response = await frappe.call({
                        method: 'mobile_pos.api.create_stock_transfer_from_orders',
                        args: { date: deliveryDate }
                    });

                    const result = response.message || response;

                    if (result.success) {
                        // Show success with print option
                        showStockTransferSuccess(result, deliveryDate);
                    } else {
                        showStyledAlert(result.message || 'حدث خطأ أثناء إنشاء حركة المخزون', 'error');
                    }
                } catch (error) {
                    console.error('Error creating stock transfer:', error);
                    showStyledAlert('حدث خطأ في الاتصال بالخادم', 'error');
                }

                $btn.prop('disabled', false);
                $btn.html('<i class="fa fa-truck"></i> تحميل');
            }
        });
    });
}

// Styled alert dialog with close button and click outside to close
function showStyledAlert(message, type = 'info') {
    const icons = {
        error: { icon: 'fa-times-circle', color: '#ef4444' },
        warning: { icon: 'fa-exclamation-triangle', color: '#f59e0b' },
        success: { icon: 'fa-check-circle', color: '#10b981' },
        info: { icon: 'fa-info-circle', color: '#3b82f6' }
    };
    const { icon, color } = icons[type] || icons.info;
    const title = type === 'error' ? 'خطأ' : type === 'warning' ? 'تنبيه' : type === 'success' ? 'تم بنجاح' : 'معلومة';

    const d = new frappe.ui.Dialog({
        title: `<span style="color: ${color}"><i class="fa ${icon}"></i> ${title}</span>`,
        fields: [{
            fieldtype: 'HTML',
            fieldname: 'alert_content'
        }],
        primary_action_label: 'إغلاق',
        primary_action: function() {
            d.hide();
        }
    });

    d.fields_dict.alert_content.$wrapper.html(`
        <div style="text-align: center; padding: 20px;">
            <i class="fa ${icon}" style="font-size: 4em; color: ${color}; margin-bottom: 20px;"></i>
            <p style="font-size: 1.1em; color: #1e293b; margin: 0; line-height: 1.6;">${message}</p>
        </div>
    `);

    // Style the dialog
    d.$wrapper.find('.modal-dialog').css({'max-width': '400px'});
    d.$wrapper.find('.modal-content').css({'border-radius': '16px'});
    d.$wrapper.find('.btn-primary').css({
        'background': color,
        'border': 'none',
        'border-radius': '10px',
        'padding': '12px 30px',
        'font-weight': '600',
        'font-size': '1rem'
    });

    // Click outside to close
    d.$wrapper.find('.modal').on('click', function(e) {
        if ($(e.target).hasClass('modal')) {
            d.hide();
        }
    });

    d.show();
    return d;
}

// Styled confirm dialog with close button and click outside to close
function showStyledConfirm(options) {
    const { icon, iconColor, title, message, detail, confirmText, confirmColor, onConfirm } = options;

    const d = new frappe.ui.Dialog({
        title: title,
        fields: [{
            fieldtype: 'HTML',
            fieldname: 'confirm_content'
        }],
        primary_action_label: confirmText || 'تأكيد',
        primary_action: function() {
            d.hide();
            if (onConfirm) onConfirm();
        },
        secondary_action_label: 'إلغاء',
        secondary_action: function() {
            d.hide();
        }
    });

    d.fields_dict.confirm_content.$wrapper.html(`
        <div style="text-align: center; padding: 20px;">
            <i class="fa ${icon}" style="font-size: 4em; color: ${iconColor}; margin-bottom: 20px;"></i>
            <p style="font-size: 1.05em; color: #64748b; margin-bottom: 10px;">${message}</p>
            ${detail ? `<p style="font-weight: 700; font-size: 1.15em; color: #1e293b;">${detail}</p>` : ''}
        </div>
    `);

    // Style the dialog
    d.$wrapper.find('.modal-dialog').css({'max-width': '420px'});
    d.$wrapper.find('.modal-content').css({'border-radius': '16px'});
    d.$wrapper.find('.btn-primary').css({
        'background': confirmColor || '#10b981',
        'border': 'none',
        'border-radius': '10px',
        'padding': '12px 24px',
        'font-weight': '600',
        'font-size': '1rem'
    });
    d.$wrapper.find('.btn-secondary, .btn-default').css({
        'border-radius': '10px',
        'padding': '12px 24px',
        'font-weight': '600',
        'font-size': '1rem'
    });

    // Click outside to close
    d.$wrapper.find('.modal').on('click', function(e) {
        if ($(e.target).hasClass('modal')) {
            d.hide();
        }
    });

    d.show();
    return d;
}

// Show success dialog with print option
function showStockTransferSuccess(result, deliveryDate) {
    const d = new frappe.ui.Dialog({
        title: '<span style="color: #10b981"><i class="fa fa-check-circle"></i> تم بنجاح</span>',
        fields: [{
            fieldtype: 'HTML',
            fieldname: 'success_content'
        }],
        primary_action_label: '<i class="fa fa-print"></i> طباعة',
        primary_action: function() {
            d.hide();
            printStockTransferReceipt(result, deliveryDate);
        },
        secondary_action_label: 'إغلاق',
        secondary_action: function() {
            d.hide();
        }
    });

    d.fields_dict.success_content.$wrapper.html(`
        <div style="text-align: center; padding: 20px;">
            <i class="fa fa-check-circle" style="font-size: 4em; color: #10b981; margin-bottom: 20px;"></i>
            <h4 style="font-weight: 700; color: #1e293b; margin-bottom: 15px;">${result.message}</h4>
            <div style="background: #f0fdf4; border-radius: 12px; padding: 15px; text-align: right;">
                <p style="margin: 8px 0; color: #166534;"><strong>عدد الطلبات:</strong> ${result.orders_count || '-'}</p>
                <p style="margin: 8px 0; color: #166534;"><strong>عدد الأصناف:</strong> ${result.items_count}</p>
                <p style="margin: 8px 0; color: #166534;"><strong>من:</strong> ${result.source_warehouse}</p>
                <p style="margin: 8px 0; color: #166534;"><strong>إلى:</strong> ${result.target_warehouse}</p>
            </div>
            <p style="margin-top: 15px; color: #64748b; font-size: 0.95em;">هل تريد طباعة إيصال التحميل؟</p>
        </div>
    `);

    // Style the dialog
    d.$wrapper.find('.modal-dialog').css({'max-width': '450px'});
    d.$wrapper.find('.modal-content').css({'border-radius': '16px'});
    d.$wrapper.find('.btn-primary').css({
        'background': 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
        'border': 'none',
        'border-radius': '10px',
        'padding': '12px 24px',
        'font-weight': '600',
        'font-size': '1rem'
    });
    d.$wrapper.find('.btn-secondary, .btn-default').css({
        'border-radius': '10px',
        'padding': '12px 24px',
        'font-weight': '600',
        'font-size': '1rem'
    });

    // Click outside to close
    d.$wrapper.find('.modal').on('click', function(e) {
        if ($(e.target).hasClass('modal')) {
            d.hide();
        }
    });

    d.show();
}

// Print stock transfer receipt
function printStockTransferReceipt(result, deliveryDate) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('ar-SA');
    const timeStr = now.toLocaleTimeString('ar-SA');

    // ===== ANDROID NATIVE PRINTING =====
    if (typeof Android !== 'undefined' && Android.isPrinterAvailable && Android.isPrinterAvailable()) {
        try {
            let textContent = '';
            textContent += '================================\n';
            textContent += (typeof company_print_name !== 'undefined' ? company_print_name : 'Elnoor-النور') + '\n';
            if (typeof company_phone !== 'undefined' && company_phone) { textContent += company_phone + '\n'; }
            textContent += '================================\n';
            textContent += 'إيصال تحميل بضاعة\n';
            textContent += result.stock_entry + '\n';
            textContent += '--------------------------------\n';
            textContent += 'تاريخ التسليم: ' + deliveryDate + '\n';
            textContent += 'من المستودع: ' + result.source_warehouse + '\n';
            textContent += 'إلى المستودع: ' + result.target_warehouse + '\n';
            textContent += 'عدد الطلبات: ' + result.orders_count + '\n';
            textContent += 'عدد الأصناف: ' + result.items_count + '\n';
            textContent += '--------------------------------\n';
            textContent += '# | الصنف | الوحدة | الكمية\n';
            textContent += '--------------------------------\n';

            if (customerOrdersData && customerOrdersData.items) {
                customerOrdersData.items.forEach((item, idx) => {
                    textContent += (idx + 1) + ' | ' + item.item_name + ' | ' + item.uom + ' | ' + item.total_qty + '\n';
                });
            }

            textContent += '================================\n';
            textContent += 'تاريخ الطباعة: ' + dateStr + ' - ' + timeStr + '\n';

            // Use printReceipt with text_content for raw text printing
            const printData = {
                type: 'raw_text',
                text_content: textContent
            };
            Android.printReceipt(JSON.stringify(printData));
            return;
        } catch (e) {
            console.error('Android print error:', e);
        }
    }

    // ===== BROWSER PRINTING (Fallback) =====
    let itemsHtml = '';
    if (customerOrdersData && customerOrdersData.items) {
        customerOrdersData.items.forEach((item, idx) => {
            itemsHtml += `<tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${idx + 1}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.item_name}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.uom}</td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center; font-weight: bold;">${item.total_qty}</td>
            </tr>`;
        });
    }

    const html = `<!DOCTYPE html>
<html dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>إيصال تحميل - ${result.stock_entry}</title>
    <style>
        @media print { @page { size: 80mm auto; margin: 5mm; } body { width: 80mm; } }
        body { font-family: 'Arial', sans-serif; direction: rtl; margin: 0; padding: 10px; font-size: 12px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
        .header h2 { margin: 5px 0; font-size: 16px; }
        .header p { margin: 3px 0; font-size: 11px; }
        .info { margin-bottom: 15px; }
        .info p { margin: 5px 0; font-size: 11px; }
        .info strong { color: #333; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        th { background: #333; color: white; padding: 8px; text-align: right; font-size: 11px; }
        td { font-size: 11px; }
        .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 2px solid #000; font-size: 10px; }
        .success-badge { background: #10b981; color: white; padding: 5px 15px; border-radius: 20px; display: inline-block; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h2>إيصال تحميل بضاعة</h2>
        <span class="success-badge">مسودة</span>
        <p><strong>${result.stock_entry}</strong></p>
    </div>
    <div class="info">
        <p><strong>تاريخ التسليم:</strong> ${deliveryDate}</p>
        <p><strong>من المستودع:</strong> ${result.source_warehouse}</p>
        <p><strong>إلى المستودع:</strong> ${result.target_warehouse}</p>
        <p><strong>عدد الطلبات:</strong> ${result.orders_count}</p>
        <p><strong>عدد الأصناف:</strong> ${result.items_count}</p>
    </div>
    <table>
        <thead>
            <tr>
                <th style="width: 30px;">#</th>
                <th>الصنف</th>
                <th style="width: 50px; text-align: center;">الوحدة</th>
                <th style="width: 50px; text-align: center;">الكمية</th>
            </tr>
        </thead>
        <tbody>
            ${itemsHtml}
        </tbody>
    </table>
    <div class="footer">
        <p>تاريخ الطباعة: ${dateStr} - ${timeStr}</p>
        <p>تم الطباعة بواسطة نظام نقطة البيع</p>
    </div>
    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
                setTimeout(function() { window.close(); }, 100);
            }, 250);
        };
    </script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=320,height=600');
    win.document.write(html);
    win.document.close();
}

// Show print option dialog after invoice creation
function showInvoicePrintOption(doc, customer_label, items, calc, paid_amount, payment_type, customer_balance) {
    const d = new frappe.ui.Dialog({
        title: '<span style="color: #10b981"><i class="fa fa-check-circle"></i> تم إنشاء الفاتورة</span>',
        fields: [{
            fieldtype: 'HTML',
            fieldname: 'invoice_content'
        }],
        primary_action_label: '<i class="fa fa-print"></i> طباعة',
        primary_action: function() {
            d.hide();
            // Print the receipt
            printPOSReceipt(
                doc.name,
                customer_label,
                items,
                calc.total,
                calc.discount,
                calc.grand_total,
                paid_amount,
                payment_type,
                doc.custom_hash,
                false,
                customer_balance
            );
            // Clear and start new invoice
            setTimeout(() => location.reload(), 500);
        },
        secondary_action_label: 'فاتورة جديدة',
        secondary_action: function() {
            d.hide();
            location.reload();
        }
    });

    // Format balance color
    const balanceColor = (customer_balance || 0) > 0 ? '#dc2626' : '#16a34a';

    d.fields_dict.invoice_content.$wrapper.html(`
        <div style="text-align: center; padding: 20px;">
            <i class="fa fa-check-circle" style="font-size: 4em; color: #10b981; margin-bottom: 20px;"></i>
            <h4 style="font-weight: 700; color: #1e293b; margin-bottom: 10px;">تم إنشاء الفاتورة بنجاح</h4>
            <p style="font-size: 1.2em; color: #10b981; font-weight: 700; margin-bottom: 15px;">${doc.name}</p>
            <div style="background: #f0fdf4; border-radius: 12px; padding: 15px; text-align: right; margin-bottom: 15px;">
                <p style="margin: 8px 0; color: #166534;"><strong>العميل:</strong> ${customer_label}</p>
                <p style="margin: 8px 0; color: #166534;"><strong>الإجمالي:</strong> ${format_number(calc.grand_total)}</p>
                <p style="margin: 8px 0; color: #166534;"><strong>المدفوع:</strong> ${format_number(paid_amount)}</p>
                <p style="margin: 8px 0; color: ${balanceColor};"><strong>رصيد العميل:</strong> ${format_number(customer_balance || 0)}</p>
            </div>
            <p style="color: #64748b; font-size: 1em;">هل تريد طباعة الفاتورة؟</p>
        </div>
    `);

    // Style the dialog - top center of screen
    d.$wrapper.find('.modal-dialog').css({
        'max-width': '420px',
        'margin': '20px auto'
    });
    d.$wrapper.find('.modal-content').css({'border-radius': '16px'});
    d.$wrapper.find('.modal-footer').css({
        'display': 'flex',
        'justify-content': 'center',
        'gap': '10px',
        'flex-direction': 'row-reverse'
    });
    d.$wrapper.find('.btn-primary').css({
        'background': 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
        'border': 'none',
        'border-radius': '10px',
        'padding': '14px 28px',
        'font-weight': '700',
        'font-size': '1.1rem'
    });
    d.$wrapper.find('.btn-secondary, .btn-default').css({
        'background': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'color': 'white',
        'border': 'none',
        'border-radius': '10px',
        'padding': '14px 28px',
        'font-weight': '700',
        'font-size': '1.1rem'
    });

    // Click outside to close and go to new invoice
    d.$wrapper.find('.modal').on('click', function(e) {
        if ($(e.target).hasClass('modal')) {
            d.hide();
            location.reload();
        }
    });

    d.show();
}

// Show duplicate invoice dialog with print option
function showDuplicateInvoiceDialog(duplicate_invoice_data, message, customer_label) {
    // Handle both old format (string) and new format (object)
    const invoiceName = typeof duplicate_invoice_data === 'object' ? duplicate_invoice_data.name : duplicate_invoice_data;
    const invoiceDate = typeof duplicate_invoice_data === 'object' ? duplicate_invoice_data.posting_date : '';
    const invoiceTime = typeof duplicate_invoice_data === 'object' ? duplicate_invoice_data.posting_time : '';
    const invoiceTotal = typeof duplicate_invoice_data === 'object' ? duplicate_invoice_data.grand_total : 0;

    const d = new frappe.ui.Dialog({
        title: '<span style="color: #f59e0b"><i class="fa fa-exclamation-triangle"></i> فاتورة مكررة</span>',
        fields: [{
            fieldtype: 'HTML',
            fieldname: 'duplicate_content'
        }],
        primary_action_label: '<i class="fa fa-print"></i> طباعة الفاتورة السابقة',
        primary_action: async function() {
            d.hide();
            // Fetch invoice details and print
            try {
                let inv_res = await frappe.call({
                    method: "mobile_pos.mobile_pos.page.mini_pos.api.mini_pos_invoice_details",
                    args: { invoice_name: invoiceName }
                });
                if (inv_res.message) {
                    let inv = inv_res.message;
                    let items = inv.items.map(i => ({
                        item_code: i.item_code,
                        item_name: i.item_name,
                        qty: i.qty,
                        rate: i.rate,
                        uom: i.uom
                    }));
                    printPOSReceipt(
                        inv.name,
                        inv.customer_name || customer_label,
                        items,
                        inv.total,
                        inv.discount_amount || 0,
                        inv.grand_total,
                        inv.paid_amount || 0,
                        '',
                        inv.custom_hash,
                        inv.is_return,
                        inv.customer_balance || 0
                    );
                }
            } catch (err) {
                frappe.msgprint(__('حدث خطأ أثناء طباعة الفاتورة'));
            }
        },
        secondary_action_label: '<i class="fa fa-times"></i> إغلاق',
        secondary_action: function() {
            d.hide();
        }
    });

    d.fields_dict.duplicate_content.$wrapper.html(`
        <div style="text-align: center; padding: 20px;">
            <i class="fa fa-exclamation-triangle" style="font-size: 4em; color: #f59e0b; margin-bottom: 20px;"></i>
            <h4 style="font-weight: 700; color: #1e293b; margin-bottom: 15px;">${message}</h4>
            <div style="background: #fef3c7; border-radius: 12px; padding: 15px; margin: 15px 0; text-align: right;">
                <p style="margin: 10px 0; color: #92400e; font-size: 1.1em;">
                    <i class="fa fa-file-text" style="margin-left: 8px;"></i>
                    <strong>رقم الفاتورة:</strong> ${invoiceName}
                </p>
                ${invoiceDate ? `
                <p style="margin: 10px 0; color: #92400e; font-size: 1.1em;">
                    <i class="fa fa-calendar" style="margin-left: 8px;"></i>
                    <strong>التاريخ:</strong> ${invoiceDate}
                </p>
                ` : ''}
                ${invoiceTime ? `
                <p style="margin: 10px 0; color: #92400e; font-size: 1.1em;">
                    <i class="fa fa-clock-o" style="margin-left: 8px;"></i>
                    <strong>الوقت:</strong> ${invoiceTime}
                </p>
                ` : ''}
                ${invoiceTotal ? `
                <p style="margin: 10px 0; color: #92400e; font-size: 1.2em; font-weight: 700;">
                    <i class="fa fa-money" style="margin-left: 8px;"></i>
                    <strong>الإجمالي:</strong> ${format_number(invoiceTotal)}
                </p>
                ` : ''}
            </div>
            <p style="color: #64748b; font-size: 1em; margin-top: 15px;">
                يمكنك طباعة الفاتورة السابقة أو إغلاق هذه النافذة
            </p>
        </div>
    `);

    // Style the dialog - top center of screen
    d.$wrapper.find('.modal-dialog').css({
        'max-width': '420px',
        'margin': '20px auto'
    });
    d.$wrapper.find('.modal-content').css({'border-radius': '16px'});
    d.$wrapper.find('.modal-footer').css({
        'display': 'flex',
        'justify-content': 'center',
        'gap': '10px',
        'flex-direction': 'row-reverse'
    });
    d.$wrapper.find('.btn-primary').css({
        'background': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'border': 'none',
        'border-radius': '10px',
        'padding': '14px 28px',
        'font-weight': '700',
        'font-size': '1.1rem'
    });
    d.$wrapper.find('.btn-secondary, .btn-default').css({
        'background': '#64748b',
        'color': 'white',
        'border': 'none',
        'border-radius': '10px',
        'padding': '14px 28px',
        'font-weight': '700',
        'font-size': '1.1rem'
    });

    d.show();
}

function displayOrdersByItem(data) {
    if (!data.items || data.items.length === 0) {
        return '<p style="text-align: center; padding: 20px; color: #666;">لا توجد طلبات لهذا التاريخ</p>';
    }

    let html = '<div style="overflow-x: auto;">';
    html += '<table style="width: 100%; border-collapse: collapse; margin-top: 10px;">';
    html += '<thead style="background: #f5f5f5;">';
    html += '<tr>';
    html += '<th style="padding: 12px; text-align: right; border: 1px solid #ddd;">الصنف</th>';
    html += '<th style="padding: 12px; text-align: center; border: 1px solid #ddd;">الوحدة</th>';
    html += '<th style="padding: 12px; text-align: center; border: 1px solid #ddd;">الكمية الإجمالية</th>';
    html += '</tr>';
    html += '</thead>';
    html += '<tbody>';

    data.items.forEach((item, index) => {
        const bgColor = index % 2 === 0 ? '#ffffff' : '#f9f9f9';
        html += `<tr style="background: ${bgColor};">`;
        html += `<td style="padding: 12px; border: 1px solid #ddd; text-align: right;">${item.item_name}</td>`;
        html += `<td style="padding: 12px; border: 1px solid #ddd; text-align: center;">${item.uom}</td>`;
        html += `<td style="padding: 12px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${item.total_qty}</td>`;
        html += '</tr>';
    });

    html += '</tbody>';
    html += '</table>';
    html += '</div>';

    return html;
}

function displayOrdersByCustomer(data) {
    if (!data.customers || data.customers.length === 0) {
        return '<p style="text-align: center; padding: 20px; color: #666;">لا توجد طلبات لهذا التاريخ</p>';
    }

    let html = '';

    data.customers.forEach((customer, idx) => {
        html += '<div style="margin-bottom: 25px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">';
        html += `<div style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); color: white; padding: 15px;">`;
        html += `<h4 style="margin: 0; font-size: 1.1rem;">${customer.customer_name}</h4>`;
        html += `<p style="margin: 5px 0 0 0; font-size: 0.9rem; opacity: 0.9;">الهاتف: ${customer.customer_phone || 'غير متوفر'}</p>`;
        html += '</div>';

        if (customer.items && customer.items.length > 0) {
            html += '<div style="overflow-x: auto;">';
            html += '<table style="width: 100%; border-collapse: collapse;">';
            html += '<thead style="background: #f5f5f5;">';
            html += '<tr>';
            html += '<th style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">الصنف</th>';
            html += '<th style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">الوحدة</th>';
            html += '<th style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">الكمية</th>';
            html += '</tr>';
            html += '</thead>';
            html += '<tbody>';

            customer.items.forEach((item, itemIdx) => {
                const bgColor = itemIdx % 2 === 0 ? '#ffffff' : '#f9f9f9';
                html += `<tr style="background: ${bgColor};">`;
                html += `<td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${item.item_name}</td>`;
                html += `<td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.uom}</td>`;
                html += `<td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center; font-weight: bold;">${item.qty}</td>`;
                html += '</tr>';
            });

            html += '</tbody>';
            html += '</table>';
            html += '</div>';
        }

        html += '</div>';
    });

    return html;
}

function printCustomerOrders(deliveryDate) {
    if (!customerOrdersData) return;

    // ===== ANDROID NATIVE PRINTING =====
    if (typeof Android !== 'undefined' && Android.isPrinterAvailable && Android.isPrinterAvailable()) {
        try {
            let textContent = '';
            textContent += '================================\n';
            textContent += (typeof company_print_name !== 'undefined' ? company_print_name : 'Elnoor-النور') + '\n';
            if (typeof company_phone !== 'undefined' && company_phone) { textContent += company_phone + '\n'; }
            textContent += '================================\n';
            textContent += 'طلبات العملاء\n';
            textContent += 'تاريخ التسليم: ' + deliveryDate + '\n';
            textContent += 'التاريخ: ' + new Date().toLocaleDateString('ar-SA') + '\n';
            textContent += '--------------------------------\n';

            if (customerOrdersGroupBy === 'item') {
                textContent += 'الصنف | الوحدة | الكمية\n';
                textContent += '--------------------------------\n';
                if (customerOrdersData.items) {
                    customerOrdersData.items.forEach(item => {
                        textContent += item.item_name + ' | ' + item.uom + ' | ' + item.total_qty + '\n';
                    });
                }
            } else {
                if (customerOrdersData.customers) {
                    customerOrdersData.customers.forEach(customer => {
                        textContent += '================================\n';
                        textContent += customer.customer_name;
                        if (customer.customer_phone) textContent += ' - ' + customer.customer_phone;
                        textContent += '\n';
                        textContent += '--------------------------------\n';

                        if (customer.items && customer.items.length > 0) {
                            customer.items.forEach(item => {
                                textContent += item.item_name + ' | ' + item.uom + ' | ' + item.qty + '\n';
                            });
                        }
                    });
                }
            }

            textContent += '================================\n';
            textContent += 'تم الطباعة بواسطة نظام نقطة البيع\n';

            // Use printReceipt with text_content for raw text printing
            const printData = {
                type: 'raw_text',
                text_content: textContent
            };
            Android.printReceipt(JSON.stringify(printData));
            return;
        } catch (e) {
            console.error('Android print error:', e);
        }
    }

    // ===== BROWSER PRINTING (Fallback) =====
    let bodyContent = '';

    if (customerOrdersGroupBy === 'item') {
        bodyContent += '<table>';
        bodyContent += '<thead><tr><th>الصنف</th><th style="text-align: center;">الوحدة</th><th style="text-align: center;">الكمية</th></tr></thead>';
        bodyContent += '<tbody>';

        if (customerOrdersData.items) {
            customerOrdersData.items.forEach(item => {
                bodyContent += '<tr>';
                bodyContent += `<td>${item.item_name}</td>`;
                bodyContent += `<td style="text-align: center;">${item.uom}</td>`;
                bodyContent += `<td style="text-align: center;">${item.total_qty}</td>`;
                bodyContent += '</tr>';
            });
        }

        bodyContent += '</tbody></table>';
    } else {
        if (customerOrdersData.customers) {
            customerOrdersData.customers.forEach(customer => {
                bodyContent += '<div class="customer-section">';
                bodyContent += `<div class="customer-header">${customer.customer_name}`;
                if (customer.customer_phone) {
                    bodyContent += ` - ${customer.customer_phone}`;
                }
                bodyContent += '</div>';

                if (customer.items && customer.items.length > 0) {
                    bodyContent += '<table>';
                    bodyContent += '<thead><tr><th>الصنف</th><th style="text-align: center;">الوحدة</th><th style="text-align: center;">الكمية</th></tr></thead>';
                    bodyContent += '<tbody>';

                    customer.items.forEach(item => {
                        bodyContent += '<tr>';
                        bodyContent += `<td>${item.item_name}</td>`;
                        bodyContent += `<td style="text-align: center;">${item.uom}</td>`;
                        bodyContent += `<td style="text-align: center;">${item.qty}</td>`;
                        bodyContent += '</tr>';
                    });

                    bodyContent += '</tbody></table>';
                }

                bodyContent += '</div>';
            });
        }
    }

    let html = `<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>طلبات العملاء - ${deliveryDate}</title>
  <style>
    @media print { @page { size: 80mm auto; margin: 5mm; } body { width: 80mm; } }
    body { font-family: 'Arial', sans-serif; direction: rtl; margin: 0; padding: 10px; font-size: 12px; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
    .header h2 { margin: 5px 0; font-size: 16px; }
    .header p { margin: 3px 0; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    th, td { padding: 5px; border-bottom: 1px solid #ddd; text-align: right; }
    th { background: #f0f0f0; font-weight: bold; font-size: 11px; }
    td { font-size: 11px; }
    .customer-section { margin-bottom: 20px; page-break-inside: avoid; }
    .customer-header { background: #333; color: white; padding: 8px; margin-bottom: 5px; font-weight: bold; font-size: 12px; }
    .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 2px solid #000; font-size: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h2>طلبات العملاء</h2>
    <p>تاريخ التسليم: ${deliveryDate}</p>
    <p>التاريخ: ${new Date().toLocaleDateString('ar-SA')}</p>
    <p>الوقت: ${new Date().toLocaleTimeString('ar-SA')}</p>
  </div>
  ${bodyContent}
  <div class="footer">
    <p>تم الطباعة بواسطة نظام نقطة البيع</p>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        setTimeout(function() { window.close(); }, 100);
      }, 250);
    };
  </script>
</body>
</html>`;

    let win = window.open('', '_blank', 'width=320,height=600');
    win.document.write(html);
    win.document.close();
}

// --- Daily Sales Button ---
$(wrapper).on('click', '#mini-pos-daily-sales-btn', function() {
    openDailySalesDialog();
});

// --- Expenses Button ---
$(wrapper).on('click', '#mini-pos-expenses-btn', function() {
    openExpensesDialog();
});

async function openExpensesDialog() {
    // Fetch expense types first
    let expenseTypes = [];
    try {
        let res = await frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Expense",
                filters: { company: profile.company },
                fields: ["name", "expense_name"],
                limit_page_length: 0
            }
        });
        expenseTypes = res.message || [];
    } catch (e) {
        showStyledError('خطأ', 'تعذر تحميل أنواع المصروفات');
        return;
    }

    if (!expenseTypes.length) {
        showStyledError('تنبيه', 'لا توجد أنواع مصروفات متاحة', 'warning');
        return;
    }

    // Build expense type cards
    let expenseTypeCards = expenseTypes.map(et =>
        `<div class="expense-type-card" data-value="${escape_html(et.name)}" data-label="${escape_html(et.expense_name || et.name)}" style="
            padding: 12px 15px;
            border: 2px solid #e5e7eb;
            border-radius: 10px;
            cursor: pointer;
            text-align: center;
            background: #fff;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            min-height: 50px;
        ">
            <i class="fa fa-file-text-o" style="font-size: 1.1em; color: #9ca3af;"></i>
            <span style="font-size: 15px; font-weight: 600; color: #374151;">${escape_html(et.expense_name || et.name)}</span>
        </div>`
    ).join('');

    let d = new frappe.ui.Dialog({
        title: '<i class="fa fa-money"></i> تسجيل مصروف',
        fields: [
            {
                fieldtype: 'HTML',
                fieldname: 'expense_header',
                options: `
                    <div style="background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
                                color: white;
                                padding: 15px 20px;
                                border-radius: 12px;
                                margin-bottom: 20px;
                                text-align: center;">
                        <i class="fa fa-file-text-o" style="font-size: 2em; margin-bottom: 8px;"></i>
                        <div style="font-size: 1.1em; font-weight: 600;">إدخال مصروف جديد</div>
                    </div>
                `
            },
            {
                fieldtype: 'HTML',
                fieldname: 'expense_type_html',
                options: `
                    <div class="form-group" style="margin-bottom: 20px; position: relative;">
                        <label class="control-label" style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151; font-size: 13px;">
                            نوع المصروف <span style="color: #ef4444;">*</span>
                        </label>
                        <div id="expense-type-trigger" style="
                            width: 100%;
                            padding: 12px 15px;
                            border: 1px solid #d1d5db;
                            border-radius: 8px;
                            font-size: 15px;
                            font-weight: 500;
                            background: #fff;
                            color: #9ca3af;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            direction: rtl;
                        ">
                            <span id="expense-type-display">اختر نوع المصروف</span>
                            <i class="fa fa-chevron-down" style="font-size: 12px; color: #9ca3af;"></i>
                        </div>
                        <div id="expense-type-dropdown" style="
                            display: none;
                            position: absolute;
                            top: 100%;
                            left: 0;
                            right: 0;
                            background: #fff;
                            border: 1px solid #e5e7eb;
                            border-radius: 12px;
                            box-shadow: 0 10px 40px rgba(0,0,0,0.15);
                            z-index: 1000;
                            padding: 10px;
                            margin-top: 5px;
                            max-height: 250px;
                            overflow-y: auto;
                        ">
                            <div style="
                                display: flex;
                                flex-direction: column;
                                gap: 8px;
                            ">
                                ${expenseTypeCards}
                            </div>
                        </div>
                        <input type="hidden" id="expense-type-select" value="">
                        <input type="hidden" id="expense-type-label" value="">
                    </div>
                `
            },
            {
                fieldtype: 'HTML',
                fieldname: 'amount_html',
                options: `
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label class="control-label" style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151; font-size: 13px;">
                            المبلغ <span style="color: #ef4444;">*</span>
                        </label>
                        <input type="number" id="expense-amount-input" inputmode="decimal" placeholder="0.00" step="0.01" min="0" style="
                            width: 100%;
                            padding: 12px 15px;
                            border: 1px solid #d1d5db;
                            border-radius: 8px;
                            font-size: 24px;
                            font-weight: 700;
                            text-align: center;
                            direction: ltr;
                            background: #fff;
                            color: #1e293b;
                        ">
                    </div>
                `
            },
            {
                fieldtype: 'HTML',
                fieldname: 'remark_html',
                options: `
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label class="control-label" style="display: block; margin-bottom: 8px; font-weight: 600; color: #374151; font-size: 13px;">
                            ملاحظات
                        </label>
                        <textarea id="expense-remark-input" rows="2" placeholder="أدخل أي ملاحظات إضافية..." style="
                            width: 100%;
                            padding: 12px 15px;
                            border: 1px solid #d1d5db;
                            border-radius: 8px;
                            font-size: 14px;
                            background: #fff;
                            resize: none;
                            direction: rtl;
                        "></textarea>
                    </div>
                `
            }
        ],
        primary_action_label: '<i class="fa fa-check"></i> تسجيل المصروف',
        primary_action: function() {
            let expense = d.$wrapper.find('#expense-type-select').val();
            let expenseLabel = d.$wrapper.find('#expense-type-label').val();
            let amount = parseFloat(d.$wrapper.find('#expense-amount-input').val()) || 0;
            let remark = d.$wrapper.find('#expense-remark-input').val() || '';

            if (!expense) {
                showStyledError('تنبيه', 'الرجاء اختيار نوع المصروف');
                return;
            }
            if (amount <= 0) {
                showStyledError('تنبيه', 'الرجاء إدخال مبلغ صحيح');
                return;
            }

            const mode = selected_mode_value || modes[0] || '';
            if (!mode) {
                showStyledError('تنبيه', 'الرجاء اختيار طريقة الدفع أولاً');
                return;
            }

            // Show confirmation dialog
            showExpenseConfirmation(d, { expense: expense, expenseLabel: expenseLabel, amount: amount, remark: remark }, mode);
        },
        secondary_action_label: '<i class="fa fa-times"></i> إلغاء',
        secondary_action: function() {
            d.hide();
        }
    });

    // Add custom styles to dialog
    d.$wrapper.find('.modal-dialog').css({
        'max-width': '420px'
    });
    d.$wrapper.find('.modal-content').css({
        'border-radius': '16px',
        'overflow': 'hidden'
    });
    d.$wrapper.find('.btn-primary').css({
        'background': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'border': 'none',
        'border-radius': '10px',
        'padding': '10px 24px',
        'font-weight': '600'
    });
    d.$wrapper.find('.btn-secondary, .btn-default').css({
        'border-radius': '10px',
        'padding': '10px 24px'
    });

    // Handle expense type dropdown toggle
    d.$wrapper.on('click', '#expense-type-trigger', function(e) {
        e.stopPropagation();
        let dropdown = d.$wrapper.find('#expense-type-dropdown');
        dropdown.toggle();
    });

    // Handle expense type card selection
    d.$wrapper.on('click', '.expense-type-card', function() {
        let $card = $(this);
        let value = $card.data('value');
        let label = $card.data('label');

        // Update hidden inputs
        d.$wrapper.find('#expense-type-select').val(value);
        d.$wrapper.find('#expense-type-label').val(label);

        // Update display
        d.$wrapper.find('#expense-type-display').text(label).css('color', '#1e293b');

        // Style selected card
        d.$wrapper.find('.expense-type-card').css({
            'border-color': '#e5e7eb',
            'background': '#fff'
        }).find('i').css('color', '#9ca3af');

        $card.css({
            'border-color': '#ef4444',
            'background': '#fef2f2'
        }).find('i').css('color', '#ef4444');

        // Hide dropdown
        d.$wrapper.find('#expense-type-dropdown').hide();
    });

    // Handle numpad clicks
    d.$wrapper.on('click', '.expense-numpad-btn', function() {
        let btn = $(this);
        let value = btn.data('value').toString();
        let input = d.$wrapper.find('#expense-amount-input');
        let current = input.val() || '';

        if (value === '⌫') {
            input.val(current.slice(0, -1));
        } else if (value === '.') {
            if (!current.includes('.')) {
                input.val(current + value);
            }
        } else {
            // Limit decimal places to 2
            if (current.includes('.') && current.split('.')[1].length >= 2) {
                return;
            }
            input.val(current + value);
        }
    });

    // Add hover effect to numpad buttons
    d.$wrapper.on('mouseenter', '.expense-numpad-btn', function() {
        $(this).css('background', $(this).data('value') === '⌫' ? '#fecaca' : '#f3f4f6');
    }).on('mouseleave', '.expense-numpad-btn', function() {
        $(this).css('background', $(this).data('value') === '⌫' ? '#fee2e2' : '#fff');
    });

    // Close dropdown when clicking outside
    $(document).on('click.expenseDropdown', function(e) {
        if (!$(e.target).closest('#expense-type-trigger, #expense-type-dropdown').length) {
            d.$wrapper.find('#expense-type-dropdown').hide();
        }
    });

    d.$wrapper.on('hidden.bs.modal', function() {
        $(document).off('click.expenseDropdown');
    });

    d.show();
}

function showExpenseConfirmation(parentDialog, values, mode) {
    const formattedAmount = Number(values.amount).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    const displayName = values.expenseLabel || values.expense;

    let confirmDialog = new frappe.ui.Dialog({
        title: '<i class="fa fa-question-circle"></i> تأكيد تسجيل المصروف',
        fields: [
            {
                fieldtype: 'HTML',
                fieldname: 'confirmation_content',
                options: `
                    <div style="direction: rtl; text-align: right;">
                        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
                                    padding: 20px;
                                    border-radius: 12px;
                                    margin-bottom: 20px;
                                    border: 2px solid #f59e0b;">
                            <div style="text-align: center; margin-bottom: 15px;">
                                <i class="fa fa-exclamation-triangle" style="font-size: 2.5em; color: #f59e0b;"></i>
                            </div>
                            <div style="font-size: 1.1em; font-weight: 600; text-align: center; color: #92400e;">
                                هل أنت متأكد من تسجيل هذا المصروف؟
                            </div>
                        </div>

                        <div style="background: #f8fafc;
                                    border-radius: 12px;
                                    padding: 15px;
                                    border: 1px solid #e2e8f0;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 10px 5px; color: #64748b; font-weight: 500;">
                                        <i class="fa fa-tag"></i> نوع المصروف
                                    </td>
                                    <td style="padding: 10px 5px; font-weight: 700; color: #1e293b;">
                                        ${displayName}
                                    </td>
                                </tr>
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 10px 5px; color: #64748b; font-weight: 500;">
                                        <i class="fa fa-money"></i> المبلغ
                                    </td>
                                    <td style="padding: 10px 5px; font-weight: 700; color: #ef4444; font-size: 1.2em;">
                                        ${formattedAmount}
                                    </td>
                                </tr>
                                <tr style="border-bottom: 1px solid #e2e8f0;">
                                    <td style="padding: 10px 5px; color: #64748b; font-weight: 500;">
                                        <i class="fa fa-credit-card"></i> طريقة الدفع
                                    </td>
                                    <td style="padding: 10px 5px; font-weight: 600; color: #1e293b;">
                                        ${mode}
                                    </td>
                                </tr>
                                ${values.remark ? `
                                <tr>
                                    <td style="padding: 10px 5px; color: #64748b; font-weight: 500;">
                                        <i class="fa fa-comment"></i> ملاحظات
                                    </td>
                                    <td style="padding: 10px 5px; color: #1e293b;">
                                        ${values.remark}
                                    </td>
                                </tr>
                                ` : ''}
                            </table>
                        </div>
                    </div>
                `
            }
        ],
        primary_action_label: '<i class="fa fa-check-circle"></i> تأكيد التسجيل',
        primary_action: async function() {
            confirmDialog.disable_primary_action();

            // Show loading state
            confirmDialog.$wrapper.find('.btn-primary').html('<i class="fa fa-spinner fa-spin"></i> جاري التسجيل...');

            try {
                const response = await frappe.call({
                    method: 'mobile_pos.mobile_pos.page.mini_pos.api.create_expense_entry',
                    args: {
                        expense: values.expense,
                        amount: values.amount,
                        remark: values.remark || '',
                        mode_of_payment: mode,
                        pos_profile: profile.name,
                        company: profile.company
                    }
                });

                if (response.message && response.message.success) {
                    confirmDialog.hide();
                    parentDialog.hide();

                    // Show success popup
                    showExpenseSuccessPopup(response.message.name, displayName, formattedAmount);
                } else {
                    showStyledError('خطأ', response.message.error || 'حدث خطأ أثناء تسجيل المصروف');
                    confirmDialog.enable_primary_action();
                    confirmDialog.$wrapper.find('.btn-primary').html('<i class="fa fa-check-circle"></i> تأكيد التسجيل');
                }
            } catch (error) {
                console.error('Error creating expense entry:', error);
                showStyledError('خطأ في الاتصال', 'حدث خطأ في الاتصال بالخادم');
                confirmDialog.enable_primary_action();
                confirmDialog.$wrapper.find('.btn-primary').html('<i class="fa fa-check-circle"></i> تأكيد التسجيل');
            }
        },
        secondary_action_label: '<i class="fa fa-arrow-right"></i> رجوع',
        secondary_action: function() {
            confirmDialog.hide();
        }
    });

    // Style confirmation dialog
    confirmDialog.$wrapper.find('.modal-dialog').css({
        'max-width': '450px'
    });
    confirmDialog.$wrapper.find('.modal-content').css({
        'border-radius': '16px',
        'overflow': 'hidden'
    });
    confirmDialog.$wrapper.find('.btn-primary').css({
        'background': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'border': 'none',
        'border-radius': '10px',
        'padding': '12px 28px',
        'font-weight': '600'
    });
    confirmDialog.$wrapper.find('.btn-secondary, .btn-default').css({
        'border-radius': '10px',
        'padding': '12px 28px'
    });

    confirmDialog.show();
}

function showExpenseSuccessPopup(docName, expenseType, amount) {
    let successDialog = new frappe.ui.Dialog({
        title: '',
        fields: [
            {
                fieldtype: 'HTML',
                fieldname: 'success_content',
                options: `
                    <div style="text-align: center; padding: 20px;">
                        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                                    width: 80px;
                                    height: 80px;
                                    border-radius: 50%;
                                    margin: 0 auto 20px;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;">
                            <i class="fa fa-check" style="font-size: 2.5em; color: white;"></i>
                        </div>
                        <h3 style="color: #10b981; margin-bottom: 10px; font-weight: 700;">
                            تم تسجيل المصروف بنجاح!
                        </h3>
                        <div style="background: #f0fdf4;
                                    border-radius: 12px;
                                    padding: 15px;
                                    margin: 15px 0;
                                    border: 1px solid #bbf7d0;">
                            <div style="color: #166534; font-weight: 600; font-size: 1.1em;">
                                ${docName}
                            </div>
                            <div style="color: #15803d; margin-top: 8px;">
                                ${expenseType} - <span style="font-weight: 700;">${amount}</span>
                            </div>
                        </div>
                    </div>
                `
            }
        ],
        primary_action_label: '<i class="fa fa-check"></i> حسناً',
        primary_action: function() {
            successDialog.hide();
        }
    });

    // Style success dialog
    successDialog.$wrapper.find('.modal-dialog').css({
        'max-width': '380px'
    });
    successDialog.$wrapper.find('.modal-content').css({
        'border-radius': '20px',
        'overflow': 'hidden'
    });
    successDialog.$wrapper.find('.modal-header').hide();
    successDialog.$wrapper.find('.btn-primary').css({
        'background': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'border': 'none',
        'border-radius': '10px',
        'padding': '12px 40px',
        'font-weight': '600',
        'width': '100%'
    });

    successDialog.show();

    // Auto close after 3 seconds
    setTimeout(() => {
        if (successDialog.$wrapper.is(':visible')) {
            successDialog.hide();
        }
    }, 3000);
}

// Daily Sales Dialog and Functions
let dailySalesData = null;

function openDailySalesDialog() {
    const today = frappe.datetime.get_today();

    let d = new frappe.ui.Dialog({
        title: 'مبيعات اليوم',
        fields: [
            {
                fieldtype: 'Date',
                fieldname: 'sales_date',
                label: 'التاريخ',
                default: today,
                reqd: 1
            },
            {
                fieldtype: 'HTML',
                fieldname: 'sales_content'
            }
        ],
        primary_action_label: 'عرض المبيعات',
        primary_action: function() {
            fetchDailySales(d);
        }
    });

    d.show();

    // Auto-fetch when date changes
    d.fields_dict.sales_date.$input.on('change', function() {
        fetchDailySales(d);
    });

    // Fetch on open
    fetchDailySales(d);
}

async function fetchDailySales(dialog) {
    const salesDate = dialog.get_value('sales_date');

    if (!salesDate) {
        showStyledError('تنبيه', 'الرجاء اختيار التاريخ');
        return;
    }

    dialog.fields_dict.sales_content.$wrapper.html(`
        <div style="text-align: center; padding: 20px;">
            <i class="fa fa-spinner fa-spin" style="font-size: 2rem; color: #8b5cf6;"></i>
            <p style="margin-top: 10px;">جاري التحميل...</p>
        </div>
    `);

    try {
        const response = await frappe.call({
            method: 'mobile_pos.api.get_daily_sales',
            args: {
                date: salesDate
            }
        });

        const result = response.message || response;

        if (result.success) {
            dailySalesData = result;
            displayDailySalesInDialog(dialog, result);
        } else {
            dialog.fields_dict.sales_content.$wrapper.html(`
                <div style="color: #ef4444; padding: 15px; background: #fef2f2; border-radius: 8px; text-align: center;">
                    ${result.message || 'حدث خطأ أثناء جلب البيانات'}
                </div>
            `);
        }

    } catch (error) {
        console.error('Error fetching daily sales:', error);
        dialog.fields_dict.sales_content.$wrapper.html(`
            <div style="color: #ef4444; padding: 15px; background: #fef2f2; border-radius: 8px; text-align: center;">
                حدث خطأ في الاتصال بالخادم
            </div>
        `);
    }
}

function displayDailySalesInDialog(dialog, data) {
    if (!data.items || data.items.length === 0) {
        dialog.fields_dict.sales_content.$wrapper.html('<p style="text-align: center; padding: 20px; color: #666;">لا توجد مبيعات لهذا التاريخ</p>');
        return;
    }

    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 10px; background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); border-radius: 8px; color: white;">
            <h4 style="margin: 0; font-size: 1rem;">مبيعات اليوم</h4>
            <button type="button" id="print-daily-sales-btn" class="btn btn-xs" style="background: white; color: #8b5cf6;">
                <i class="fa fa-print"></i> طباعة
            </button>
        </div>
        <div style="max-height: 400px; overflow-y: auto;">
    `;

    // Items table
    html += '<table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">';
    html += '<thead style="background: #f5f5f5;">';
    html += '<tr>';
    html += '<th style="padding: 10px; text-align: right; border: 1px solid #ddd;">الصنف</th>';
    html += '<th style="padding: 10px; text-align: center; border: 1px solid #ddd;">الكمية</th>';
    html += '<th style="padding: 10px; text-align: center; border: 1px solid #ddd;">المبلغ</th>';
    html += '</tr>';
    html += '</thead>';
    html += '<tbody>';

    data.items.forEach((item, index) => {
        const bgColor = index % 2 === 0 ? '#ffffff' : '#f9f9f9';
        html += `<tr style="background: ${bgColor};">`;
        html += `<td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${item.item_name}</td>`;
        html += `<td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${item.qty}</td>`;
        html += `<td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${format_currency(item.amount)}</td>`;
        html += '</tr>';
    });

    html += '</tbody>';
    html += '</table>';

    // Total
    html += `
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); color: white; padding: 15px; border-radius: 8px; text-align: center; margin-top: 10px;">
            <h3 style="margin: 0; font-size: 1.3rem;">الإجمالي: ${format_currency(data.total_amount)}</h3>
        </div>
    `;

    html += '</div>';

    dialog.fields_dict.sales_content.$wrapper.html(html);

    // Set up print button handler
    dialog.$wrapper.off('click', '#print-daily-sales-btn').on('click', '#print-daily-sales-btn', function() {
        printDailySales(dialog.get_value('sales_date'));
    });
}

function printDailySales(salesDate) {
    if (!dailySalesData || !dailySalesData.items) return;

    // ===== ANDROID NATIVE PRINTING =====
    if (typeof Android !== 'undefined' && Android.isPrinterAvailable && Android.isPrinterAvailable()) {
        try {
            let textContent = '';
            // Header
            textContent += '================================\n';
            textContent += (typeof company_print_name !== 'undefined' ? company_print_name : 'Elnoor-النور') + '\n';
            if (typeof company_phone !== 'undefined' && company_phone) { textContent += company_phone + '\n'; }
            textContent += '================================\n';
            textContent += 'مبيعات اليوم\n';
            textContent += 'التاريخ: ' + salesDate + '\n';
            textContent += 'وقت الطباعة: ' + new Date().toLocaleTimeString('ar-SA') + '\n';
            textContent += '--------------------------------\n';

            // Items header
            textContent += 'الصنف | الكمية | المبلغ\n';
            textContent += '--------------------------------\n';

            // Items
            dailySalesData.items.forEach(item => {
                textContent += (item.item_name || '') + ' | ' + (item.qty || 0) + ' | ' + format_currency(item.amount) + '\n';
            });

            textContent += '--------------------------------\n';

            // Total
            textContent += '================================\n';
            textContent += 'الإجمالي: ' + format_currency(dailySalesData.total_amount) + '\n';
            textContent += '================================\n';

            // Footer
            textContent += 'تم الطباعة بواسطة نظام نقطة البيع\n';

            // Use printReceipt with text_content for raw text printing
            const printData = {
                type: 'raw_text',
                text_content: textContent
            };
            Android.printReceipt(JSON.stringify(printData));
            return;
        } catch (e) {
            console.error('Android print error:', e);
            // Fall through to browser printing
        }
    }
    // ===== BROWSER PRINTING (Fallback) =====

    let itemsHtml = '';
    dailySalesData.items.forEach(item => {
        itemsHtml += '<tr>';
        itemsHtml += `<td>${item.item_name}</td>`;
        itemsHtml += `<td style="text-align: center;">${item.qty}</td>`;
        itemsHtml += `<td style="text-align: center;">${format_currency(item.amount)}</td>`;
        itemsHtml += '</tr>';
    });

    let html = `<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>مبيعات اليوم - ${salesDate}</title>
  <style>
    @media print { @page { size: 80mm auto; margin: 5mm; } body { width: 80mm; } }
    body { font-family: 'Arial', sans-serif; direction: rtl; margin: 0; padding: 10px; font-size: 12px; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
    .header h2 { margin: 5px 0; font-size: 16px; }
    .header p { margin: 3px 0; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
    th, td { padding: 5px; border-bottom: 1px solid #ddd; text-align: right; }
    th { background: #f0f0f0; font-weight: bold; font-size: 11px; }
    td { font-size: 11px; }
    .total { text-align: center; font-size: 14px; font-weight: bold; border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; }
    .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 2px solid #000; font-size: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h2>مبيعات اليوم</h2>
    <p>التاريخ: ${salesDate}</p>
    <p>وقت الطباعة: ${new Date().toLocaleTimeString('ar-SA')}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>الصنف</th>
        <th style="text-align: center;">الكمية</th>
        <th style="text-align: center;">المبلغ</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>
  <div class="total">
    الإجمالي: ${format_currency(dailySalesData.total_amount)}
  </div>
  <div class="footer">
    <p>تم الطباعة بواسطة نظام نقطة البيع</p>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        setTimeout(function() { window.close(); }, 100);
      }, 250);
    };
  </script>
</body>
</html>`;

    let win = window.open('', '_blank', 'width=320,height=600');
    win.document.write(html);
    win.document.close();
}

    // --- POS Balance, Stock, Ledger: always show as message with print ---
    $(wrapper).on('click keydown', '#mini-pos-balance-btn', async function(e) {
        if (e.type === "keydown" && e.which !== 13 && e.which !== 32) return;
        let $btn = $(this);
        $btn.css("pointer-events", "none");
        let orig = $btn.html();
        $btn.html(`<i class="fa fa-spinner fa-spin"></i> <span class="mini-pos-act-label-label">${TEXT.POS_BALANCE_BTN}</span>`);
        try {
            let res = await frappe.call({ method: "mobile_pos.mobile_pos.page.mini_pos.api.mini_pos_balance" });
            let balances = (res.message && res.message.balances) || [];
            let company = (res.message && res.message.company) || "";
            let columns = [
                { label: TEXT.POS_MODE, fieldname: "mode_of_payment", align: "left" },
                { label: TEXT.POS_ACCOUNT, fieldname: "account", align: "left" },
                { label: TEXT.AMOUNT, fieldname: "amount", align: "right", fieldtype: "Currency" }
            ];
            let rows = (balances||[]).map(b => ({
                mode_of_payment: b.mode_of_payment, account: b.account, amount: b.amount
            }));
            let dialog_id = "mini-pos-balance-table-" + Math.floor(Math.random()*999999);
            let table = tableHtml({columns, rows});
            let html = `
                <div id="${dialog_id}">
                    <div style="font-weight:700;font-size:1.08em;margin-bottom:10px;">
                        ${TEXT.POS_BALANCE_TITLE}
                    </div>
                    ${table}
                    <div style="margin-top:14px;text-align:right;">
                        <button type="button" class="btn btn-xs btn-primary" onclick="window.miniPosPrintBalanceTable && window.miniPosPrintBalanceTable()">
                            <i class="fa fa-print"></i> ${TEXT.PRINT}
                        </button>
                    </div>
                </div>
            `;
            window.miniPosPrintBalanceTable = function() {
                printTableDialog({
                    title: TEXT.POS_BALANCE_TITLE,
                    company,
                    columns,
                    rows
                });
            };
            frappe.msgprint({
                title: TEXT.POS_BALANCE_TITLE,
                message: html,
                indicator: 'blue'
            });
        } catch(e) {
            showStyledError('خطأ', e.message || TEXT.FETCH_POS_BALANCE_ERROR);
        }
        $btn.html(orig);
        $btn.css("pointer-events", "auto");
    });

    // --- Stock Balance as Table in Dialog with Print ---
    $(wrapper).on('click', '#mini-pos-stock-btn', async function() {
        let $btn = $(this);
        let item_codes = pos_items.map(i => i.item_code);
        $btn.prop("disabled", true);
        try {
            let res = await frappe.call({
                method: "mobile_pos.mobile_pos.page.mini_pos.api.mini_pos_stock_balance",
                args: { items: item_codes }
            });
            let stock = res.message || [];
            let columns = [
                { label: TEXT.STOCK_ITEM_CODE, fieldname: "item_code", align: "left" },
                { label: TEXT.STOCK_ITEM_NAME, fieldname: "item_name", align: "left" },
                { label: TEXT.STOCK_QTY, fieldname: "actual_qty", align: "right", fieldtype: "Float" }
            ];
            let rows = (stock||[]).map(row => ({
                item_code: row.item_code,
                item_name: row.item_name || row.item_code,
                actual_qty: row.actual_qty
            }));
            let dialog_id = "mini-pos-stock-table-" + Math.floor(Math.random()*999999);
            let table = tableHtml({columns, rows});
            let html = `
                <div id="${dialog_id}">
                    <div style="font-weight:700;font-size:1.08em;margin-bottom:10px;">
                        ${TEXT.STOCK_BALANCE_TITLE}
                    </div>
                    ${table}
                    <div style="margin-top:14px;text-align:right;">
                        <button type="button" class="btn btn-xs btn-primary" onclick="window.miniPosPrintStockTable && window.miniPosPrintStockTable()">
                            <i class="fa fa-print"></i> ${TEXT.PRINT}
                        </button>
                    </div>
                </div>
            `;
            window.miniPosPrintStockTable = function() {
                printTableDialog({
                    title: TEXT.STOCK_BALANCE_TITLE,
                    company: warehouse || '',
                    columns,
                    rows
                });
            };
            frappe.msgprint({
                title: TEXT.STOCK_BALANCE_TITLE,
                message: html,
                indicator: 'blue'
            });
        } catch(e) {
            showStyledError('خطأ', e.message || TEXT.FETCH_STOCK_ERROR);
        }
        $btn.prop("disabled", false);
    });

    // --- Remove item ---
    $(wrapper).on('click', '.mini-pos-remove', function() {
        if (return_mode) return;
        let idx = $(this).data('idx');
        pos_items.splice(idx, 1);
        renderItems();
        updateNewBtn();
    });

    // Add Customer Modal with Full Name, Mobile Phone, Customer Group, Territory
    $(wrapper).on('click', '#mini-pos-add-customer-btn', async function(e) {
        if (!allow_add_customer) return false;

        // Fetch Customer Groups and Territories
        let customer_groups = [];
        let territories = [];

        try {
            let [groups_res, territories_res] = await Promise.all([
                frappe.call('frappe.client.get_list', {
                    doctype: 'Customer Group',
                    fields: ['name'],
                    filters: { is_group: 0 },
                    limit_page_length: 500
                }),
                frappe.call('frappe.client.get_list', {
                    doctype: 'Territory',
                    fields: ['name'],
                    filters: { is_group: 0 },
                    limit_page_length: 500
                })
            ]);

            customer_groups = (groups_res.message || []).map(g => g.name);
            territories = (territories_res.message || []).map(t => t.name);
        } catch(e) {
            console.error('Error fetching customer groups/territories:', e);
        }

        // Set defaults
        let default_group = customer_groups.length > 0 ? customer_groups[0] : '';
        let default_territory = territories.length > 0 ? territories[0] : '';

        let dialog = new frappe.ui.Dialog({
            title: TEXT.ADD_CUSTOMER_DIALOG,
            fields: [
                {
                    fieldtype: 'Data',
                    label: TEXT.CUSTOMER_FULL_NAME,
                    fieldname: 'customer_name',
                    reqd: 1,
                    description: TEXT.CUSTOMER_FULL_NAME_DESC
                },
                {
                    fieldtype: 'Data',
                    label: TEXT.CUSTOMER_MOBILE,
                    fieldname: 'mobile_no',
                    reqd: 1,
                    description: TEXT.CUSTOMER_MOBILE_DESC
                },
                {
                    fieldtype: 'Link',
                    label: 'مجموعة العملاء',
                    fieldname: 'customer_group',
                    options: 'Customer Group',
                    reqd: 1,
                    default: default_group
                },
                {
                    fieldtype: 'Link',
                    label: 'المنطقة',
                    fieldname: 'territory',
                    options: 'Territory',
                    reqd: 1,
                    default: default_territory
                }
            ],
            primary_action_label: TEXT.ADD_CUSTOMER_CONFIRM,
            primary_action: async function(values) {
                // Convert Arabic numerals and clean mobile number
                let mobile = convertArabicToEnglishNumbers(values.mobile_no || '');
                mobile = mobile.replace(/\D/g, '');

                // Validate mobile number length and format
                if (!mobile || mobile.length !== 11) {
                    showStyledError(TEXT.CUSTOMER_MOBILE, TEXT.CUSTOMER_MOBILE_INVALID);
                    return;
                }

                if (!/^(010|011|012|015)\d{8}$/.test(mobile)) {
                    showStyledError(TEXT.CUSTOMER_MOBILE, TEXT.CUSTOMER_MOBILE_INVALID);
                    return;
                }

                if (!values.customer_name || values.customer_name.trim() === '') {
                    showStyledError(TEXT.CUSTOMER_FULL_NAME, TEXT.CUSTOMER_FULL_NAME_DESC);
                    return;
                }

                dialog.hide();

                try {
                    let r = await frappe.call({
                        method: 'mobile_pos.mobile_pos.page.mini_pos.api.mini_pos_create_customer',
                        args: {
                            customer_name: values.customer_name.trim(),
                            customer_type: 'Individual',
                            customer_group: values.customer_group || default_group,
                            territory: values.territory || default_territory
                        }
                    });

                    // Update the customer with mobile number
                    if (r.message && r.message.name) {
                        await frappe.call('frappe.client.set_value', {
                            doctype: 'Customer',
                            name: r.message.name,
                            fieldname: 'mobile_no',
                            value: mobile
                        });
                    }

                    customers.push({value: r.message.name, label: r.message.customer_name});
                    customerSelector.setData(customers);
                    $('#mini-pos-customer').val(r.message.customer_name);
                    $('#mini-pos-customer').trigger('input');
                    showMsg(TEXT.CUSTOMER_CREATED, 'success');
                    updateNewBtn();
                } catch (e) {
                    showMsg(e.message || TEXT.CUSTOMER_CREATE_ERROR, "error");
                }
            }
        });

        dialog.show();
        dialog.$wrapper.attr('dir', 'rtl');

        // Add custom styling to the dialog
        dialog.$wrapper.find('.modal-dialog').css({
            'max-width': '480px',
            'margin': '1.75rem auto'
        });

        // Style and handle mobile input field
        let $mobileInput = dialog.$wrapper.find('input[data-fieldname="mobile_no"]');
        $mobileInput.attr({
            'inputmode': 'tel',
            'pattern': '[0-9]*',
            'maxlength': '11',
            'placeholder': '01012345678'
        });

        // Handle Arabic to English conversion and formatting on input
        $mobileInput.on('input', function() {
            let value = $(this).val();
            // Convert Arabic numerals to English
            value = convertArabicToEnglishNumbers(value);
            // Remove all non-numeric characters
            value = value.replace(/\D/g, '');
            // Limit to 11 digits
            if (value.length > 11) {
                value = value.substring(0, 11);
            }
            $(this).val(value);
        });

        dialog.$wrapper.find('input[data-fieldname="customer_name"]').attr({
            'placeholder': 'محمد أحمد'
        });
    });


    // --- Submit invoice ---
    $(wrapper).on('click', '#mini-pos-submit', async function(e) {
        e.preventDefault();
        let customer_label = $('#mini-pos-customer').val(), customer = findValue(customers, customer_label);
    if (!customer) return showMsg(TEXT.VALIDATE_CUSTOMER, "error");
    if (!pos_items.length) return showMsg(TEXT.PLEASE_ADD_ITEM, "error");
        let payment_type = ensureModeSelectionValid({ syncStorage: true });

        $('#mini-pos-submit').prop('disabled', true).html(`<i class="fa fa-spinner fa-spin"></i> ${TEXT.SUBMITTING}`);

        // --- Calculate totals for payment ---
        let calc = calculate_tax_and_grand_total(pos_items);
        let invoice = {
            customer,
            items: pos_items.map(i => ({
                item_code: i.item_code,
                qty: i.qty,
                rate: i.rate,
                uom: i.uom,
                conversion_factor: i.conversion_factor
            })),
            mode_of_payment: payment_type,
            total: calc.total,
            taxes: [],
            discount_amount: calc.discount,
            apply_discount_on: "Grand Total",
            paid_amount: 0
        };
        let paidVal = Math.max(0, parseFloat(paid_amount) || 0);
        // Allow overpayment - excess will be stored in customer account
        invoice.paid_amount = paidVal > 0 ? Math.min(paidVal, calc.grand_total) : 0;
        invoice.overpayment_amount = paidVal > calc.grand_total ? paidVal - calc.grand_total : 0;
        try {
            let r = await frappe.call({ method: "mobile_pos.mobile_pos.page.mini_pos.api.mini_pos_create_invoice", type: "POST", args: { data: JSON.stringify(invoice) } });
            let doc = r.message;

            // Check if duplicate invoice detected
            if (doc.duplicate) {
                showDuplicateInvoiceDialog(doc.duplicate_invoice, doc.message, customer_label);
                $('#mini-pos-submit').prop('disabled', false).html(`<i class="fa fa-check"></i> ${TEXT.SUBMIT_PRINT}`);
                return;
            }

            $('#mini-pos-result').html(`<div class="mini-pos-success">${TEXT.SUCCESS_CREATED_INVOICE(escape_html(doc.name))}</div>
                <button id="mini-pos-print" class="btn btn-outline-secondary btn-sm" style="margin-bottom:7px;"><i class="fa fa-print"></i> ${TEXT.PRINT}</button>
                <button id="mini-pos-new" class="btn btn-link btn-sm ml-2" style="margin-bottom:7px;">${TEXT.NEW_INVOICE_LINK}</button>`);
            $('#mini-pos-submit').hide();
            last_invoice = doc.name;

            // Get customer balance after this invoice
            let balance_res = await frappe.call({
                method: "mobile_pos.mobile_pos.page.mini_pos.api.mini_pos_get_customer_balance",
                args: { customer: customer }
            });
            let customer_balance = balance_res.message || 0;

            // Calculate total paid (invoice payment + overpayment)
            let totalPaid = (invoice.paid_amount || 0) + (invoice.overpayment_amount || 0);

            // Store invoice data for reprint
            last_invoice_data = {
                name: doc.name,
                customer_label: customer_label,
                customer: customer,
                items: pos_items,
                total: calc.total,
                discount: calc.discount,
                grand_total: calc.grand_total,
                paid_amount: totalPaid,
                payment_mode: payment_type,
                custom_hash: doc.custom_hash,
                customer_balance: customer_balance
            };

            // Show print option dialog
            showInvoicePrintOption(doc, customer_label, pos_items, calc, totalPaid, payment_type, customer_balance);
            return;
        } catch (err) {
            let msg = err.message || (err._server_messages && JSON.parse(err._server_messages)[0]) || TEXT.GENERIC_ERROR;
            showMsg(msg, "error");
        }
        $('#mini-pos-submit').prop('disabled', false).html(`<i class="fa fa-check"></i> ${TEXT.SUBMIT_PRINT}`);
    });


    // --- New Invoice Button ---
    function clearMiniPOS() {
        // Clear all relevant fields
        $('#mini-pos-customer').val('');
        let defaultMode = resolveDefaultMode();
        setModeSelection(defaultMode);
        saveMode(defaultMode);
        pos_items = [];
        last_invoice = null;
        last_invoice_data = null;
        return_mode = false;
        discount_amount = 0;
        $('#mini-pos-discount').val('0.00').prop('disabled', false);
        paid_amount_manual = false;
        paid_amount = 0;
        $('#mini-pos-paid').val('0.00').prop('disabled', false);

        // Clear item grid
        renderItems();
        updateNewBtn();
        update_top_action_btns();

        // Hide result, submit, etc
        $('#mini-pos-result').empty();
        $('#mini-pos-submit').show().prop('disabled', false).html(`<i class="fa fa-check"></i> ${TEXT.SUBMIT_PRINT}`);
        // Hide "New Invoice", "Print" buttons if present
        $('#mini-pos-new').remove();
        $('#mini-pos-print').remove();
        // Focus first field
        setTimeout(()=>$('#mini-pos-customer').focus(), 10);
    }
    $(wrapper).on('click', '#mini-pos-new', clearMiniPOS);
    $(wrapper).on('click', '#mini-pos-print', async function() {
        if (last_invoice_data) {
            // Get latest customer balance for reprint
            let customer_balance = last_invoice_data.customer_balance || 0;
            if (last_invoice_data.customer) {
                try {
                    let balance_res = await frappe.call({
                        method: "mobile_pos.mobile_pos.page.mini_pos.api.mini_pos_get_customer_balance",
                        args: { customer: last_invoice_data.customer }
                    });
                    customer_balance = balance_res.message || 0;
                } catch (e) {
                    // Use stored balance if API fails
                }
            }
            printPOSReceipt(
                last_invoice_data.name,
                last_invoice_data.customer_label,
                last_invoice_data.items,
                last_invoice_data.total,
                last_invoice_data.discount,
                last_invoice_data.grand_total,
                last_invoice_data.paid_amount,
                last_invoice_data.payment_mode,
                last_invoice_data.custom_hash,
                last_invoice_data.is_return || false,
                customer_balance
            );
        }
    });

    renderItems();
    update_top_action_btns();
    updateNewBtn();
};
