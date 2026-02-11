frappe.pages['admin'].on_page_load = function(wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'لوحة التحكم',
        single_column: true
    });

    // Hide Frappe navbar
    $('header.navbar').hide();
    $('.page-head').hide();

    // Add page content with custom header
    $(wrapper).find('.layout-main-section').html(`
        <!-- Custom Admin Header -->
        <div class="admin-header">
            <a href="/main" class="home-btn">
                <i class="fa fa-home"></i>
                <span>الرئيسية</span>
            </a>
            <div class="header-actions">
                <div class="company-filter">
                    <label for="company-select">
                        <i class="fa fa-building"></i>
                        الشركة:
                    </label>
                    <select id="company-select" class="company-select">
                        <option value="">جاري التحميل...</option>
                    </select>
                </div>
                <button class="header-btn" id="btn-refresh" title="تحديث">
                    <i class="fa fa-refresh"></i>
                </button>
            </div>
        </div>

        <div class="admin-dashboard" dir="rtl">
            <!-- Toast Container -->
            <div id="toast-container" class="toast-container"></div>

            <!-- Loading Overlay -->
            <div id="loading-overlay" class="loading-overlay">
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">جاري التحميل...</div>
                </div>
            </div>

            <!-- Summary Cards Row 1 - Sales & Purchase -->
            <div class="summary-row">
                <div class="summary-card sales-card" data-animate="1">
                    <div class="summary-icon">
                        <i class="fa fa-shopping-cart"></i>
                    </div>
                    <div class="summary-content">
                        <div class="summary-label">إجمالي المبيعات</div>
                        <div class="summary-value" id="summary-sales">
                            <span class="skeleton" style="width:80px;height:32px;display:inline-block"></span>
                        </div>
                        <div class="summary-meta">
                            <span id="chip-sales-count">- فاتورة</span>
                            <span id="chip-sales-outstanding" class="chip-warning">متبقي: -</span>
                        </div>
                    </div>
                </div>
                <div class="summary-card purchase-card" data-animate="2">
                    <div class="summary-icon">
                        <i class="fa fa-shopping-bag"></i>
                    </div>
                    <div class="summary-content">
                        <div class="summary-label">إجمالي المشتريات</div>
                        <div class="summary-value" id="summary-purchase">
                            <span class="skeleton" style="width:80px;height:32px;display:inline-block"></span>
                        </div>
                        <div class="summary-meta">
                            <span id="chip-purchase-count">- فاتورة</span>
                            <span id="chip-purchase-outstanding" class="chip-danger">متبقي: -</span>
                        </div>
                    </div>
                </div>
                <div class="summary-card stock-card" data-animate="3">
                    <div class="summary-icon">
                        <i class="fa fa-cubes"></i>
                    </div>
                    <div class="summary-content">
                        <div class="summary-label">إجمالي المخزون</div>
                        <div class="summary-value" id="summary-stock">
                            <span class="skeleton" style="width:80px;height:32px;display:inline-block"></span>
                        </div>
                        <div class="summary-meta">
                            <span id="chip-items">- أصناف</span>
                        </div>
                    </div>
                </div>
                <div class="summary-card payment-card" data-animate="4">
                    <div class="summary-icon">
                        <i class="fa fa-credit-card"></i>
                    </div>
                    <div class="summary-content">
                        <div class="summary-label">رصيد الخزن</div>
                        <div class="summary-value" id="summary-payment">
                            <span class="skeleton" style="width:80px;height:32px;display:inline-block"></span>
                        </div>
                        <div class="summary-meta">
                            <span id="chip-mop">- خزن</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Summary Cards Row 2 - Customers & Suppliers -->
            <div class="summary-row">
                <div class="summary-card customer-card" data-animate="5">
                    <div class="summary-icon">
                        <i class="fa fa-users"></i>
                    </div>
                    <div class="summary-content">
                        <div class="summary-label">أرصدة العملاء</div>
                        <div class="summary-value" id="summary-customer">
                            <span class="skeleton" style="width:80px;height:32px;display:inline-block"></span>
                        </div>
                        <div class="summary-meta">
                            <span id="chip-customers">- عملاء</span>
                        </div>
                    </div>
                </div>
                <div class="summary-card supplier-card" data-animate="6">
                    <div class="summary-icon">
                        <i class="fa fa-truck"></i>
                    </div>
                    <div class="summary-content">
                        <div class="summary-label">أرصدة الموردين</div>
                        <div class="summary-value" id="summary-supplier">
                            <span class="skeleton" style="width:80px;height:32px;display:inline-block"></span>
                        </div>
                        <div class="summary-meta">
                            <span id="chip-suppliers">- موردين</span>
                        </div>
                    </div>
                </div>
                <div class="summary-card outstanding-sales-card" data-animate="7">
                    <div class="summary-icon">
                        <i class="fa fa-file-text-o"></i>
                    </div>
                    <div class="summary-content">
                        <div class="summary-label">متبقي المبيعات</div>
                        <div class="summary-value" id="summary-outstanding-sales">
                            <span class="skeleton" style="width:80px;height:32px;display:inline-block"></span>
                        </div>
                        <div class="summary-meta">
                            <span class="chip-info">مستحق التحصيل</span>
                        </div>
                    </div>
                </div>
                <div class="summary-card outstanding-purchase-card" data-animate="8">
                    <div class="summary-icon">
                        <i class="fa fa-file-o"></i>
                    </div>
                    <div class="summary-content">
                        <div class="summary-label">متبقي المشتريات</div>
                        <div class="summary-value" id="summary-outstanding-purchase">
                            <span class="skeleton" style="width:80px;height:32px;display:inline-block"></span>
                        </div>
                        <div class="summary-meta">
                            <span class="chip-danger">مستحق الدفع</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Today Sales & Cash Flow Row -->
            <div class="section-grid two-cols">
                <!-- Today's Sales Section -->
                <div class="dashboard-section" data-animate="9">
                    <div class="section-header">
                        <h3 class="section-title">
                            <i class="fa fa-calendar-check-o"></i>
                            مبيعات اليوم
                        </h3>
                        <div class="section-badge">
                            <span class="status-dot online"></span>
                            مباشر
                        </div>
                    </div>

                    <div class="stats-grid">
                        <div class="stat-card primary">
                            <div class="stat-icon"><i class="fa fa-money"></i></div>
                            <div class="stat-content">
                                <div class="stat-label">إجمالي اليوم</div>
                                <div class="stat-value" id="today-sales-total">-</div>
                            </div>
                        </div>
                        <div class="stat-card info">
                            <div class="stat-icon"><i class="fa fa-file-text"></i></div>
                            <div class="stat-content">
                                <div class="stat-label">عدد الفواتير</div>
                                <div class="stat-value" id="today-sales-count">-</div>
                            </div>
                        </div>
                        <div class="stat-card" id="today-change-card">
                            <div class="stat-icon"><i class="fa fa-line-chart"></i></div>
                            <div class="stat-content">
                                <div class="stat-label">مقارنة بالأمس</div>
                                <div class="stat-value" id="today-sales-change">-</div>
                            </div>
                        </div>
                        <div class="stat-card secondary">
                            <div class="stat-icon"><i class="fa fa-history"></i></div>
                            <div class="stat-content">
                                <div class="stat-label">مبيعات الأمس</div>
                                <div class="stat-value" id="yesterday-sales-total">-</div>
                            </div>
                        </div>
                    </div>

                    <div class="data-card" style="margin-top: 15px;">
                        <div class="card-header with-count">
                            <h4><i class="fa fa-star"></i> الأصناف الأكثر مبيعاً اليوم</h4>
                            <span class="record-count" id="top-items-count">0 أصناف</span>
                        </div>
                        <div class="table-container">
                            <table id="tbl-top-items">
                                <thead>
                                    <tr>
                                        <th>الصنف</th>
                                        <th>الكمية</th>
                                        <th>المبلغ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td colspan="3" class="empty-row"><span class="skeleton" style="width:150px;height:20px;display:inline-block"></span></td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Daily Cash Flow Section -->
                <div class="dashboard-section" data-animate="10">
                    <div class="section-header">
                        <h3 class="section-title">
                            <i class="fa fa-exchange"></i>
                            حركة الصندوق اليومية
                        </h3>
                        <div class="section-badge">
                            <span class="status-dot online"></span>
                            اليوم
                        </div>
                    </div>

                    <div class="cash-flow-cards">
                        <div class="cash-flow-card in">
                            <div class="cf-icon"><i class="fa fa-arrow-down"></i></div>
                            <div class="cf-label">الوارد</div>
                            <div class="cf-value" id="cash-in-total">0</div>
                        </div>
                        <div class="cash-flow-card out">
                            <div class="cf-icon"><i class="fa fa-arrow-up"></i></div>
                            <div class="cf-label">الصادر</div>
                            <div class="cf-value" id="cash-out-total">0</div>
                        </div>
                        <div class="cash-flow-card net" id="net-flow-card">
                            <div class="cf-icon"><i class="fa fa-balance-scale"></i></div>
                            <div class="cf-label">صافي</div>
                            <div class="cf-value" id="net-flow-value">0</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sales Performance & Sales by Profile Row -->
            <div class="section-grid two-cols">
                <!-- Sales Performance Section -->
                <div class="dashboard-section" data-animate="11">
                    <div class="section-header">
                        <h3 class="section-title">
                            <i class="fa fa-bar-chart"></i>
                            أداء المبيعات
                        </h3>
                        <div class="section-badge">هذا الشهر</div>
                    </div>

                    <div class="perf-cards">
                        <div class="perf-card current">
                            <div class="pf-icon"><i class="fa fa-calendar-check-o"></i></div>
                            <div class="pf-label">الشهر الحالي</div>
                            <div class="pf-value" id="perf-this-month">0</div>
                        </div>
                        <div class="perf-card last">
                            <div class="pf-icon"><i class="fa fa-calendar-o"></i></div>
                            <div class="pf-label">الشهر الماضي</div>
                            <div class="pf-value" id="perf-last-month">0</div>
                        </div>
                        <div class="perf-card change" id="perf-change-card">
                            <div class="pf-icon"><i class="fa fa-percent"></i></div>
                            <div class="pf-label">التغيير</div>
                            <div class="pf-value" id="perf-change-value">0%</div>
                        </div>
                    </div>

                </div>

                <!-- Sales by Profile Section -->
                <div class="dashboard-section" data-animate="12">
                    <div class="section-header">
                        <h3 class="section-title">
                            <i class="fa fa-users"></i>
                            مبيعات الموزعين
                        </h3>
                        <div class="section-badge" id="profile-sales-period">هذا الشهر</div>
                    </div>

                    <div class="section-controls compact">
                        <div class="search-box">
                            <i class="fa fa-search"></i>
                            <input type="text" id="profile-sales-search" placeholder="بحث في الموزعين...">
                            <button class="clear-search" id="clear-profile-sales-search">&times;</button>
                        </div>
                    </div>

                    <div class="data-card">
                        <div class="card-header with-count">
                            <h4>المبيعات حسب الموزع</h4>
                            <span class="record-count" id="profile-sales-count">0 موزع</span>
                        </div>
                        <div class="table-container">
                            <table id="tbl-profile-sales">
                                <thead>
                                    <tr>
                                        <th>الموزع</th>
                                        <th>المبيعات</th>
                                        <th>النسبة</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td colspan="3" class="empty-row"><span class="skeleton" style="width:150px;height:20px;display:inline-block"></span></td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Low Stock Section -->
            <div class="dashboard-section" data-animate="13">
                <div class="section-header">
                    <h3 class="section-title">
                        <i class="fa fa-exclamation-triangle"></i>
                        تنبيهات المخزون
                    </h3>
                    <div class="low-stock-badges">
                        <span class="alert-badge danger" id="badge-negative">
                            <i class="fa fa-minus-circle"></i>
                            سالب: <span id="count-negative">0</span>
                        </span>
                        <span class="alert-badge warning" id="badge-zero">
                            <i class="fa fa-ban"></i>
                            صفر: <span id="count-zero">0</span>
                        </span>
                        <span class="alert-badge info" id="badge-low">
                            <i class="fa fa-arrow-down"></i>
                            منخفض: <span id="count-low">0</span>
                        </span>
                    </div>
                </div>

                <div class="section-controls compact">
                    <div class="search-box">
                        <i class="fa fa-search"></i>
                        <input type="text" id="low-stock-search" placeholder="بحث في الأصناف...">
                        <button class="clear-search" id="clear-low-stock-search">&times;</button>
                    </div>
                </div>

                <div class="low-stock-grid">
                    <!-- Negative Stock -->
                    <div class="data-card low-stock-card danger" id="negative-stock-card">
                        <div class="card-header with-count">
                            <h4><i class="fa fa-minus-circle"></i> رصيد سالب</h4>
                            <span class="record-count" id="negative-stock-count">0 صنف</span>
                        </div>
                        <div class="table-container">
                            <table id="tbl-negative-stock">
                                <thead>
                                    <tr>
                                        <th>الصنف</th>
                                        <th>الرصيد</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td colspan="2" class="empty-row"><span class="skeleton" style="width:100px;height:16px;display:inline-block"></span></td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Zero Stock -->
                    <div class="data-card low-stock-card warning" id="zero-stock-card">
                        <div class="card-header with-count">
                            <h4><i class="fa fa-ban"></i> رصيد صفر</h4>
                            <span class="record-count" id="zero-stock-count">0 صنف</span>
                        </div>
                        <div class="table-container">
                            <table id="tbl-zero-stock">
                                <thead>
                                    <tr>
                                        <th>الصنف</th>
                                        <th>الرصيد</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td colspan="2" class="empty-row"><span class="skeleton" style="width:100px;height:16px;display:inline-block"></span></td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Low Stock -->
                    <div class="data-card low-stock-card info" id="low-stock-card">
                        <div class="card-header with-count">
                            <h4><i class="fa fa-arrow-down"></i> رصيد منخفض</h4>
                            <span class="record-count" id="low-stock-count">0 صنف</span>
                        </div>
                        <div class="table-container">
                            <table id="tbl-low-stock">
                                <thead>
                                    <tr>
                                        <th>الصنف</th>
                                        <th>الرصيد</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td colspan="2" class="empty-row"><span class="skeleton" style="width:100px;height:16px;display:inline-block"></span></td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Stock Section -->
            <div class="dashboard-section" data-animate="14">
                <div class="section-header">
                    <h3 class="section-title">
                        <i class="fa fa-cubes"></i>
                        المخزون
                    </h3>
                    <div class="section-actions">
                        <div class="section-badge">
                            <span class="status-dot online"></span>
                            حتى اليوم
                        </div>
                    </div>
                </div>

                <!-- Stock Controls -->
                <div class="section-controls compact">
                    <div class="search-box">
                        <i class="fa fa-search"></i>
                        <input type="text" id="stock-search" placeholder="بحث في الأصناف...">
                        <button class="clear-search" id="clear-stock-search">&times;</button>
                    </div>
                </div>

                <div class="data-card">
                    <div class="card-header with-count">
                        <h4 id="stock-table-title">أرصدة الأصناف</h4>
                        <span class="record-count" id="stock-count">0 صنف</span>
                    </div>
                    <div class="table-container">
                        <table id="tbl-stock">
                            <thead>
                                <tr>
                                    <th>الصنف</th>
                                    <th>الرصيد</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td colspan="2" class="empty-row"><span class="skeleton" style="width:200px;height:20px;display:inline-block"></span></td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Payment Section -->
            <div class="dashboard-section" data-animate="15">
                <div class="section-header">
                    <h3 class="section-title">
                        <i class="fa fa-credit-card"></i>
                        الخزن
                    </h3>
                    <div class="section-badge">
                        <span class="status-dot online"></span>
                        حتى اليوم
                    </div>
                </div>

                <!-- Payment Search -->
                <div class="section-controls compact">
                    <div class="search-box">
                        <i class="fa fa-search"></i>
                        <input type="text" id="payment-search" placeholder="بحث في الخزن...">
                        <button class="clear-search" id="clear-payment-search">&times;</button>
                    </div>
                </div>

                <div class="data-card">
                    <div class="card-header with-count">
                        <h4>الرصيد لكل خزنة</h4>
                        <span class="record-count" id="payment-count">0 خزنة</span>
                    </div>
                    <div class="table-container">
                        <table id="tbl-mop">
                            <thead>
                                <tr>
                                    <th>الخزنة</th>
                                    <th>الرصيد</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td colspan="2" class="empty-row"><span class="skeleton" style="width:200px;height:20px;display:inline-block"></span></td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Customers & Suppliers Row -->
            <div class="section-grid two-cols">
                <!-- Customers Section -->
                <div class="dashboard-section" data-animate="16">
                    <div class="section-header">
                        <h3 class="section-title">
                            <i class="fa fa-users"></i>
                            العملاء
                        </h3>
                        <div class="section-badge">حتى اليوم</div>
                    </div>

                    <!-- Customer Search -->
                    <div class="section-controls compact">
                        <div class="search-box">
                            <i class="fa fa-search"></i>
                            <input type="text" id="customer-search" placeholder="بحث في العملاء...">
                            <button class="clear-search" id="clear-customer-search">&times;</button>
                        </div>
                    </div>

                    <div class="balance-summary">
                        <div class="balance-item positive">
                            <span class="balance-label">
                                <i class="fa fa-arrow-up"></i>
                                لنا (+)
                            </span>
                            <span class="balance-value" id="total-customer-positive">-</span>
                        </div>
                        <div class="balance-item negative">
                            <span class="balance-label">
                                <i class="fa fa-arrow-down"></i>
                                علينا (-)
                            </span>
                            <span class="balance-value" id="total-customer-negative">-</span>
                        </div>
                    </div>
                    <div id="customers-container">
                        <div class="data-card">
                            <div class="card-header with-count">
                                <h4>العملاء حسب الموزع</h4>
                                <span class="record-count" id="customer-count">0 عميل</span>
                            </div>
                            <div class="table-container">
                                <table id="tbl-customers">
                                    <thead>
                                        <tr>
                                            <th>العميل</th>
                                            <th>الرصيد</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr><td colspan="2" class="empty-row"><span class="skeleton" style="width:150px;height:20px;display:inline-block"></span></td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Suppliers Section -->
                <div class="dashboard-section" data-animate="17">
                    <div class="section-header">
                        <h3 class="section-title">
                            <i class="fa fa-truck"></i>
                            الموردون
                        </h3>
                        <div class="section-badge">حتى اليوم</div>
                    </div>

                    <!-- Supplier Search -->
                    <div class="section-controls compact">
                        <div class="search-box">
                            <i class="fa fa-search"></i>
                            <input type="text" id="supplier-search" placeholder="بحث في الموردين...">
                            <button class="clear-search" id="clear-supplier-search">&times;</button>
                        </div>
                    </div>

                    <div class="balance-summary">
                        <div class="balance-item negative">
                            <span class="balance-label">
                                <i class="fa fa-arrow-down"></i>
                                علينا (+)
                            </span>
                            <span class="balance-value" id="total-supplier-positive">-</span>
                        </div>
                        <div class="balance-item positive">
                            <span class="balance-label">
                                <i class="fa fa-arrow-up"></i>
                                لنا (-)
                            </span>
                            <span class="balance-value" id="total-supplier-negative">-</span>
                        </div>
                    </div>
                    <div class="data-card">
                        <div class="card-header with-count">
                            <h4>قائمة الموردين</h4>
                            <span class="record-count" id="supplier-count">0 مورد</span>
                        </div>
                        <div class="table-container">
                            <table id="tbl-suppliers">
                                <thead>
                                    <tr>
                                        <th>المورد</th>
                                        <th>الرصيد</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td colspan="2" class="empty-row"><span class="skeleton" style="width:150px;height:20px;display:inline-block"></span></td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Expenses Section -->
            <div class="dashboard-section" data-animate="18">
                <div class="section-header">
                    <h3 class="section-title">
                        <i class="fa fa-money"></i>
                        المصروفات
                    </h3>
                    <div class="expense-total">
                        إجمالي: <span id="expenses-total">-</span>
                    </div>
                </div>

                <!-- Period Filter -->
                <div class="period-filter">
                    <button class="period-btn" data-range="today">اليوم</button>
                    <button class="period-btn" data-range="this_week">هذا الأسبوع</button>
                    <button class="period-btn active" data-range="this_month">هذا الشهر</button>
                    <button class="period-btn" data-range="last_month">الشهر الماضي</button>
                    <button class="period-btn" data-range="this_year">هذا العام</button>
                    <button class="period-btn ghost" data-range="custom">
                        <i class="fa fa-calendar"></i>
                        مخصص
                    </button>
                </div>

                <div class="selected-period">
                    <i class="fa fa-calendar-check-o"></i>
                    الفترة: <span id="expenses-period">-</span>
                </div>

                <!-- Expense Search -->
                <div class="section-controls compact">
                    <div class="search-box">
                        <i class="fa fa-search"></i>
                        <input type="text" id="expense-search" placeholder="بحث في المصروفات...">
                        <button class="clear-search" id="clear-expense-search">&times;</button>
                    </div>
                </div>

                <div class="data-card">
                    <div class="card-header with-count">
                        <h4>المصروفات حسب الفئة</h4>
                        <span class="record-count" id="expense-count">0 فئة</span>
                    </div>
                    <div class="table-container">
                        <table id="tbl-expenses">
                            <thead>
                                <tr>
                                    <th>الفئة</th>
                                    <th>الإجمالي</th>
                                    <th>النسبة</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr><td colspan="3" class="empty-row"><span class="skeleton" style="width:150px;height:20px;display:inline-block"></span></td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Row 1: Top Customers, Top Suppliers, Profit Analysis -->
            <div class="section-grid three-cols">
                <!-- Top Customers Section -->
                <div class="dashboard-section" data-animate="19">
                    <div class="section-header">
                        <h3 class="section-title">
                            <i class="fa fa-trophy"></i>
                            أفضل العملاء
                        </h3>
                        <div class="section-badge">إجمالي المبيعات</div>
                    </div>

                    <div class="data-card">
                        <div class="card-header with-count">
                            <h4><i class="fa fa-star"></i> Top 10</h4>
                            <span class="record-count" id="top-customers-count">0 عميل</span>
                        </div>
                        <div class="table-container">
                            <table id="tbl-top-customers">
                                <thead>
                                    <tr>
                                        <th>العميل</th>
                                        <th>المبيعات</th>
                                        <th>الاتجاه</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td colspan="3" class="empty-row"><span class="skeleton" style="width:150px;height:20px;display:inline-block"></span></td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Top Suppliers Section -->
                <div class="dashboard-section" data-animate="20">
                    <div class="section-header">
                        <h3 class="section-title">
                            <i class="fa fa-industry"></i>
                            أفضل الموردين
                        </h3>
                        <div class="section-badge">إجمالي المشتريات</div>
                    </div>

                    <div class="data-card">
                        <div class="card-header with-count">
                            <h4><i class="fa fa-star"></i> Top 10</h4>
                            <span class="record-count" id="top-suppliers-count">0 مورد</span>
                        </div>
                        <div class="table-container">
                            <table id="tbl-top-suppliers">
                                <thead>
                                    <tr>
                                        <th>المورد</th>
                                        <th>المشتريات</th>
                                        <th>الرصيد</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td colspan="3" class="empty-row"><span class="skeleton" style="width:150px;height:20px;display:inline-block"></span></td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Row 2: Monthly Comparison, Inventory Turnover -->
            <div class="section-grid three-cols">
                <!-- Monthly Comparison Section -->
                <div class="dashboard-section" data-animate="22">
                    <div class="section-header">
                        <h3 class="section-title">
                            <i class="fa fa-calendar"></i>
                            مقارنة الأشهر
                        </h3>
                        <div class="section-badge">آخر 6 أشهر</div>
                    </div>

                    <div class="monthly-chart" id="monthly-chart">
                        <div class="monthly-loading">
                            <span class="skeleton" style="width:100%;height:150px;display:block"></span>
                        </div>
                    </div>
                </div>


                <!-- Inventory Turnover Section -->
                <div class="dashboard-section" data-animate="24">
                    <div class="section-header">
                        <h3 class="section-title">
                            <i class="fa fa-refresh"></i>
                            دوران المخزون
                        </h3>
                        <div class="section-badge">آخر 30 يوم</div>
                    </div>

                    <div class="turnover-tabs">
                        <button class="turnover-tab active" data-tab="fast">
                            <i class="fa fa-rocket"></i> سريع الحركة
                        </button>
                        <button class="turnover-tab" data-tab="slow">
                            <i class="fa fa-hourglass"></i> بطيء الحركة
                        </button>
                    </div>

                    <div class="data-card">
                        <div class="card-header with-count">
                            <h4 id="turnover-title"><i class="fa fa-rocket"></i> الأصناف سريعة الحركة</h4>
                            <span class="record-count" id="turnover-count">0 صنف</span>
                        </div>
                        <div class="table-container">
                            <table id="tbl-turnover">
                                <thead>
                                    <tr>
                                        <th>الصنف</th>
                                        <th>المبيع</th>
                                        <th>الرصيد</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td colspan="3" class="empty-row"><span class="skeleton" style="width:150px;height:20px;display:inline-block"></span></td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Row 4: Expected Collections, Due Payables -->
            <div class="section-grid three-cols">
                <!-- Expected Collections Section -->
                <div class="dashboard-section" data-animate="26">
                    <div class="section-header">
                        <h3 class="section-title">
                            <i class="fa fa-hand-holding-usd"></i>
                            التحصيلات المتوقعة
                        </h3>
                        <div class="expected-total">
                            إجمالي: <span id="expected-collections-total">-</span>
                        </div>
                    </div>

                    <div class="data-card">
                        <div class="card-header with-count">
                            <h4><i class="fa fa-users"></i> العملاء المدينون</h4>
                            <span class="record-count" id="expected-collections-count">0 عميل</span>
                        </div>
                        <div class="table-container">
                            <table id="tbl-expected-collections">
                                <thead>
                                    <tr>
                                        <th>العميل</th>
                                        <th>الرصيد</th>
                                        <th>آخر دفعة</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td colspan="3" class="empty-row"><span class="skeleton" style="width:150px;height:20px;display:inline-block"></span></td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Due Payables Section -->
                <div class="dashboard-section" data-animate="27">
                    <div class="section-header">
                        <h3 class="section-title">
                            <i class="fa fa-credit-card"></i>
                            الالتزامات المستحقة
                        </h3>
                        <div class="expected-total danger">
                            إجمالي: <span id="due-payables-total">-</span>
                        </div>
                    </div>

                    <div class="data-card">
                        <div class="card-header with-count">
                            <h4><i class="fa fa-truck"></i> الموردين الدائنون</h4>
                            <span class="record-count" id="due-payables-count">0 مورد</span>
                        </div>
                        <div class="table-container">
                            <table id="tbl-due-payables">
                                <thead>
                                    <tr>
                                        <th>المورد</th>
                                        <th>الرصيد</th>
                                        <th>آخر فاتورة</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr><td colspan="3" class="empty-row"><span class="skeleton" style="width:150px;height:20px;display:inline-block"></span></td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>

        </div>

        <!-- Custom Period Dialog -->
        <div class="custom-dialog-overlay" id="custom-dialog">
            <div class="custom-dialog">
                <div class="dialog-header">
                    <h3>
                        <i class="fa fa-calendar"></i>
                        فترة مخصصة
                    </h3>
                    <button class="dialog-close" id="dialog-close">&times;</button>
                </div>
                <div class="dialog-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label>من تاريخ</label>
                            <input type="date" id="date-from" class="form-input">
                        </div>
                        <div class="form-group">
                            <label>إلى تاريخ</label>
                            <input type="date" id="date-to" class="form-input">
                        </div>
                    </div>
                    <div class="quick-ranges">
                        <span class="quick-range-label">اختصارات:</span>
                        <button class="quick-range-btn" data-days="7">آخر 7 أيام</button>
                        <button class="quick-range-btn" data-days="30">آخر 30 يوم</button>
                        <button class="quick-range-btn" data-days="90">آخر 3 أشهر</button>
                    </div>
                </div>
                <div class="dialog-footer">
                    <button class="btn btn-secondary" id="dialog-cancel">
                        <i class="fa fa-times"></i>
                        إلغاء
                    </button>
                    <button class="btn btn-primary" id="dialog-apply">
                        <i class="fa fa-check"></i>
                        تطبيق
                    </button>
                </div>
            </div>
        </div>
    `);

    // ==================== Utilities ====================
    const fmt = (n, d=0) => Number(n || 0).toLocaleString("en-US", {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
        useGrouping: true
    });

    // Toast notification
    function showToast(message, type = 'info', duration = 3000) {
        const container = $('#toast-container');
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        const toast = $(`
            <div class="toast toast-${type}">
                <i class="fa ${icons[type]}"></i>
                <span>${message}</span>
            </div>
        `);
        container.append(toast);
        setTimeout(() => toast.addClass('show'), 10);
        setTimeout(() => {
            toast.removeClass('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // Animated counter for values
    function animateValue(element, start, end, duration = 800) {
        const range = end - start;
        const startTime = performance.now();
        const decimals = String(end).includes('.') ? 2 : 0;

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = start + (range * easeOut);
            element.text(fmt(current, decimals));
            if (progress < 1) {
                requestAnimationFrame(update);
            } else {
                element.text(fmt(end, decimals));
            }
        }
        requestAnimationFrame(update);
    }

    // Animate elements on load
    function animateOnLoad() {
        $('[data-animate]').each(function() {
            const delay = $(this).data('animate') * 80;
            $(this).css({
                'opacity': '0',
                'transform': 'translateY(15px)'
            });
            setTimeout(() => {
                $(this).css({
                    'transition': 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    'opacity': '1',
                    'transform': 'translateY(0)'
                });
            }, delay);
        });
    }

    // Date helpers
    function toISO(dt) {
        return dt.toISOString().slice(0,10);
    }

    function todayISO() {
        const d = new Date();
        return toISO(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
    }

    function ranges(key) {
        const d = new Date();
        const to = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        if(key === 'today') {
            return [toISO(to), toISO(to)];
        }
        if(key === 'this_week') {
            const dow = (to.getDay() + 6) % 7;
            const s = new Date(to);
            s.setDate(to.getDate() - dow);
            const e = new Date(s);
            e.setDate(s.getDate() + 6);
            return [toISO(s), toISO(e)];
        }
        if(key === 'this_month') {
            const s = new Date(to.getFullYear(), to.getMonth(), 1);
            const e = new Date(to.getFullYear(), to.getMonth() + 1, 0);
            return [toISO(s), toISO(e)];
        }
        if(key === 'last_month') {
            const s = new Date(to.getFullYear(), to.getMonth() - 1, 1);
            const e = new Date(to.getFullYear(), to.getMonth(), 0);
            return [toISO(s), toISO(e)];
        }
        if(key === 'this_year') {
            const s = new Date(to.getFullYear(), 0, 1);
            const e = new Date(to.getFullYear(), 11, 31);
            return [toISO(s), toISO(e)];
        }
        return [toISO(to), toISO(to)];
    }

    // ==================== State ====================
    const balancesToDate = { from_date: null, to_date: todayISO() };
    let stockData = null;
    let paymentsData = null;
    let customersData = null;
    let suppliersData = null;
    let expensesData = null;
    let expRangeKey = 'this_month';
    let expCustom = null;
    let selectedCompany = null; // Company filter state

    // Load companies for the filter dropdown using ORM with user permissions
    async function loadCompanies() {
        return new Promise((resolve) => {
            frappe.call({
                method: "mobile_pos.api.get_user_companies",
                callback: (r) => {
                    const data = r.message || {};
                    const companies = data.companies || [];
                    const defaultCompany = data.default_company;
                    const $select = $('#company-select');
                    $select.empty();

                    // Only add "All Companies" option if user has access to multiple companies
                    if (companies.length > 1) {
                        $select.append('<option value="">جميع الشركات</option>');
                    }

                    // Add individual companies user has access to
                    companies.forEach(c => {
                        $select.append(`<option value="${c.name}">${c.company_name || c.name}</option>`);
                    });

                    // Set default to user's default company if they have access to it
                    if (defaultCompany && companies.some(c => c.name === defaultCompany)) {
                        $select.val(defaultCompany);
                        selectedCompany = defaultCompany;
                    } else if (companies.length === 1) {
                        // If user only has access to one company, select it
                        $select.val(companies[0].name);
                        selectedCompany = companies[0].name;
                    }

                    resolve(companies);
                },
                error: () => resolve([])
            });
        });
    }

    // Get the currently selected company (or null for all)
    function getSelectedCompany() {
        return selectedCompany || null;
    }

    function getExpDates() {
        if(expRangeKey === 'custom' && expCustom?.from && expCustom?.to) {
            return { from_date: expCustom.from, to_date: expCustom.to };
        }
        const [from, to] = ranges(expRangeKey);
        return { from_date: from, to_date: to };
    }

    function updateExpChips() {
        $('.period-btn').removeClass('active');
        $(`.period-btn[data-range="${expRangeKey}"]`).addClass('active');
        const { from_date, to_date } = getExpDates();
        $('#expenses-period').text(`${from_date} → ${to_date}`);
    }

    // ==================== Loading ====================
    function showLoading() {
        $('#loading-overlay').addClass('visible');
    }

    function hideLoading() {
        $('#loading-overlay').removeClass('visible');
    }

    // ==================== API Fetchers ====================
    async function fetchStock() {
        const company = getSelectedCompany();
        return new Promise((resolve, reject) => {
            frappe.call({
                method: "mobile_pos.api.get_admin_stock_balances",
                args: { sort_by: "item_name", sort_order: "asc", limit: 0, company: company },
                callback: (r) => resolve(r.message || {}),
                error: reject
            });
        });
    }

    async function fetchPayments() {
        const company = getSelectedCompany();
        return new Promise((resolve, reject) => {
            frappe.call({
                method: "mobile_pos.api.get_admin_payment_balances",
                args: {
                    sort_by: "amount",
                    sort_order: "desc",
                    limit: 0,
                    from_date: balancesToDate.from_date,
                    to_date: balancesToDate.to_date,
                    include_unmapped: 1,
                    company: company
                },
                callback: (r) => resolve(r.message || { balances: [], grand_total: 0 }),
                error: reject
            });
        });
    }

    async function fetchCustomers() {
        const company = getSelectedCompany();
        return new Promise((resolve, reject) => {
            frappe.call({
                method: "mobile_pos.api.get_admin_customer_balances",
                args: {
                    sort_by: "balance",
                    sort_order: "desc",
                    limit: 0,
                    from_date: balancesToDate.from_date,
                    to_date: balancesToDate.to_date,
                    company: company
                },
                callback: (r) => resolve(r.message || {}),
                error: reject
            });
        });
    }

    async function fetchSuppliers() {
        const company = getSelectedCompany();
        return new Promise((resolve, reject) => {
            frappe.call({
                method: "mobile_pos.api.get_admin_supplier_balances",
                args: {
                    sort_by: "balance",
                    sort_order: "desc",
                    limit: 0,
                    from_date: balancesToDate.from_date,
                    to_date: balancesToDate.to_date,
                    company: company
                },
                callback: (r) => resolve(r.message || {}),
                error: reject
            });
        });
    }

    async function fetchExpenses() {
        const { from_date, to_date } = getExpDates();
        const company = getSelectedCompany();
        return new Promise((resolve, reject) => {
            frappe.call({
                method: "mobile_pos.api.get_admin_expenses",
                args: { sort_order: "desc", limit: 0, from_date, to_date, company: company },
                callback: (r) => resolve(r.message || { rows: [], total: 0 }),
                error: reject
            });
        });
    }

    async function fetchSalesSummary() {
        const company = getSelectedCompany();
        return new Promise((resolve, reject) => {
            frappe.call({
                method: "mobile_pos.api.get_admin_sales_summary",
                args: { company: company },
                callback: (r) => resolve(r.message || { total_sales: 0, outstanding_sales: 0, invoice_count: 0 }),
                error: reject
            });
        });
    }

    async function fetchPurchaseSummary() {
        const company = getSelectedCompany();
        return new Promise((resolve, reject) => {
            frappe.call({
                method: "mobile_pos.api.get_admin_purchase_summary",
                args: { company: company },
                callback: (r) => resolve(r.message || { total_purchase: 0, outstanding_purchase: 0, invoice_count: 0 }),
                error: reject
            });
        });
    }

    async function fetchTodaySales() {
        const company = getSelectedCompany();
        return new Promise((resolve, reject) => {
            frappe.call({
                method: "mobile_pos.api.get_admin_today_sales",
                args: { company: company },
                callback: (r) => resolve(r.message || {}),
                error: reject
            });
        });
    }

    async function fetchSalesByProfile() {
        const company = getSelectedCompany();
        return new Promise((resolve, reject) => {
            frappe.call({
                method: "mobile_pos.api.get_admin_sales_by_profile",
                args: { company: company },
                callback: (r) => resolve(r.message || { profiles: [], total: 0 }),
                error: reject
            });
        });
    }

    async function fetchLowStock() {
        const company = getSelectedCompany();
        return new Promise((resolve, reject) => {
            frappe.call({
                method: "mobile_pos.api.get_admin_low_stock_items",
                args: { threshold: 10, company: company },
                callback: (r) => resolve(r.message || {}),
                error: reject
            });
        });
    }

    async function fetchDailyCashFlow() {
        const company = getSelectedCompany();
        return new Promise((resolve, reject) => {
            frappe.call({
                method: "mobile_pos.api.get_admin_daily_cash_flow",
                args: { company: company },
                callback: (r) => resolve(r.message || {}),
                error: reject
            });
        });
    }

    async function fetchSalesPerformance() {
        const company = getSelectedCompany();
        return new Promise((resolve, reject) => {
            frappe.call({
                method: "mobile_pos.api.get_admin_sales_performance",
                args: { company: company },
                callback: (r) => resolve(r.message || {}),
                error: reject
            });
        });
    }

    async function fetchTopCustomers() {
        const company = getSelectedCompany();
        return new Promise((resolve, reject) => {
            frappe.call({
                method: "mobile_pos.api.get_admin_top_customers",
                args: { limit: 10, company: company },
                callback: (r) => resolve(r.message || { customers: [] }),
                error: reject
            });
        });
    }

    async function fetchTopSuppliers() {
        const company = getSelectedCompany();
        return new Promise((resolve, reject) => {
            frappe.call({
                method: "mobile_pos.api.get_admin_top_suppliers",
                args: { limit: 10, company: company },
                callback: (r) => resolve(r.message || { suppliers: [] }),
                error: reject
            });
        });
    }

    async function fetchProfitAnalysis() {
        const company = getSelectedCompany();
        return new Promise((resolve, reject) => {
            frappe.call({
                method: "mobile_pos.api.get_admin_profit_analysis",
                args: { company: company },
                callback: (r) => resolve(r.message || {}),
                error: reject
            });
        });
    }

    async function fetchInventoryTurnover() {
        const company = getSelectedCompany();
        return new Promise((resolve, reject) => {
            frappe.call({
                method: "mobile_pos.api.get_admin_inventory_turnover",
                args: { company: company },
                callback: (r) => resolve(r.message || {}),
                error: reject
            });
        });
    }

    async function fetchMonthlyComparison() {
        const company = getSelectedCompany();
        return new Promise((resolve, reject) => {
            frappe.call({
                method: "mobile_pos.api.get_admin_monthly_comparison",
                args: { company: company },
                callback: (r) => resolve(r.message || { months: [] }),
                error: reject
            });
        });
    }

    async function fetchAgingReport() {
        const company = getSelectedCompany();
        return new Promise((resolve, reject) => {
            frappe.call({
                method: "mobile_pos.api.get_admin_aging_report",
                args: { company: company },
                callback: (r) => resolve(r.message || {}),
                error: reject
            });
        });
    }

    async function fetchExpectedCollections() {
        const company = getSelectedCompany();
        return new Promise((resolve, reject) => {
            frappe.call({
                method: "mobile_pos.api.get_admin_expected_collections",
                args: { company: company },
                callback: (r) => resolve(r.message || { customers: [] }),
                error: reject
            });
        });
    }

    async function fetchDuePayables() {
        const company = getSelectedCompany();
        return new Promise((resolve, reject) => {
            frappe.call({
                method: "mobile_pos.api.get_admin_due_payables",
                args: { company: company },
                callback: (r) => resolve(r.message || { suppliers: [] }),
                error: reject
            });
        });
    }

    // ==================== Renderers ====================
    function renderSalesSummary(sales) {
        animateValue($('#summary-sales'), 0, sales.total_sales || 0);
        animateValue($('#summary-outstanding-sales'), 0, sales.outstanding_sales || 0);
        $('#chip-sales-count').text(`${fmt(sales.invoice_count || 0)} فاتورة`);
        $('#chip-sales-outstanding').text(`متبقي: ${fmt(sales.outstanding_sales || 0, 2)}`);
    }

    function renderPurchaseSummary(purchase) {
        animateValue($('#summary-purchase'), 0, purchase.total_purchase || 0);
        animateValue($('#summary-outstanding-purchase'), 0, purchase.outstanding_purchase || 0);
        $('#chip-purchase-count').text(`${fmt(purchase.invoice_count || 0)} فاتورة`);
        $('#chip-purchase-outstanding').text(`متبقي: ${fmt(purchase.outstanding_purchase || 0, 2)}`);
    }

    function renderStock(stock, searchTerm = '') {
        stockData = stock;
        const summary = stock.summary || {};
        let items = stock.items || [];

        // Update summary chips with animation
        $('#chip-items').text(`${fmt(summary.item_count || 0)} أصناف`);
        animateValue($('#summary-stock'), 0, summary.total_value || 0);

        // Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            items = items.filter(item => {
                const itemName = (item.item_name || item.item_code || '').toLowerCase();
                const itemCode = (item.item_code || '').toLowerCase();
                return itemName.includes(term) || itemCode.includes(term);
            });
        }

        // Update record count
        $('#stock-count').text(`${fmt(items.length)} صنف`);

        // Render flat table rows
        const html = items.map((item, i) => {
            // Positive stock = good (green), Negative = bad (red)
            const balanceClass = item.balance > 0 ? 'positive' : (item.balance < 0 ? 'negative' : '');
            return `
                <tr style="animation: fadeIn 0.3s ease ${i * 0.02}s both">
                    <td class="cell-name" style="text-align: right;" title="${item.item_name || item.item_code}">
                        <i class="fa fa-cube row-icon-inline text-primary"></i>
                        ${highlightSearch(item.item_name || item.item_code, searchTerm)}
                    </td>
                    <td class="cell-number ${balanceClass}" style="text-align: left; direction: ltr;">${fmt(item.balance, 2)}</td>
                </tr>
            `;
        }).join('');

        $('#tbl-stock tbody').html(html || `<tr><td colspan="2" class="empty-row">
            <div class="empty-state">
                <i class="fa fa-inbox"></i>
                <span>${searchTerm ? 'لا توجد نتائج للبحث' : 'لا توجد بيانات'}</span>
            </div>
        </td></tr>`);
    }

    function renderPayments(payments, searchTerm = '') {
        paymentsData = payments;
        let rows = payments.balances || [];
        const total = Number(payments.grand_total || 0);

        // Filter by search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            rows = rows.filter(b => (b.mode_of_payment || '').toLowerCase().includes(term));
        }

        $('#chip-mop').text(`${fmt(payments.balances?.length || 0)} خزن`);
        $('#payment-count').text(`${fmt(rows.length)} خزنة`);
        animateValue($('#summary-payment'), 0, total);

        const html = rows.map((b, i) => {
            // Positive amount = good (green), Negative = bad (red)
            const balanceClass = b.amount > 0 ? 'positive' : (b.amount < 0 ? 'negative' : '');
            return `
                <tr style="animation: fadeIn 0.3s ease ${i * 0.03}s both">
                    <td class="cell-name" style="text-align: right;" title="${b.mode_of_payment}">
                        <i class="fa fa-wallet row-icon-inline"></i>
                        ${highlightSearch(b.mode_of_payment, searchTerm)}
                    </td>
                    <td class="cell-number ${balanceClass}" style="text-align: left; direction: ltr;">${fmt(b.amount, 2)}</td>
                </tr>
            `;
        }).join('');

        $('#tbl-mop tbody').html(html || `<tr><td colspan="2" class="empty-row">
            <div class="empty-state">
                <i class="fa fa-inbox"></i>
                <span>${searchTerm ? 'لا توجد نتائج للبحث' : 'لا توجد بيانات'}</span>
            </div>
        </td></tr>`);
    }

    function renderCustomers(data, searchTerm = '') {
        customersData = data;
        let profiles = data.profiles || [];

        // Calculate totals from all profiles
        let totalCustomers = 0;
        let total = 0;
        let totalPositive = 0;
        let totalNegative = 0;

        profiles.forEach(p => {
            totalCustomers += p.customer_count || 0;
            total += p.total_balance || 0;
            (p.customers || []).forEach(c => {
                if (c.balance > 0) totalPositive += c.balance;
                if (c.balance < 0) totalNegative += c.balance;
            });
        });

        // Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            profiles = profiles.map(p => {
                const profileName = (p.profile_name || p.profile || '').toLowerCase();
                const matchesProfile = profileName.includes(term);

                const filteredCustomers = (p.customers || []).filter(c => {
                    const customerName = (c.customer_name || c.customer || '').toLowerCase();
                    return customerName.includes(term);
                });

                if (matchesProfile) {
                    return p; // Keep all customers if profile matches
                }
                if (filteredCustomers.length > 0) {
                    return { ...p, customers: filteredCustomers, customer_count: filteredCustomers.length };
                }
                return null;
            }).filter(p => p !== null);
        }

        $('#chip-customers').text(`${fmt(totalCustomers)} عملاء`);
        $('#customer-count').text(`${fmt(totalCustomers)} عميل`);
        animateValue($('#summary-customer'), 0, total);
        animateValue($('#total-customer-positive'), 0, totalPositive);
        animateValue($('#total-customer-negative'), 0, totalNegative);

        // Render each profile as a separate table card
        let html = '';
        profiles.forEach((profile, idx) => {
            const customers = profile.customers || [];
            const balanceColor = profile.total_balance > 0 ? '#16a34a' : (profile.total_balance < 0 ? '#dc2626' : '#374151');

            // Profile card with its own table
            html += `
                <div class="data-card profile-card" style="animation: fadeIn 0.3s ease ${idx * 0.05}s both; margin-bottom: 15px; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                    <div class="card-header with-count" style="background: rgba(100, 116, 139, 0.1); backdrop-filter: blur(10px); border-bottom: 2px solid #e2e8f0; padding: 14px 18px;">
                        <h4 style="margin: 0; display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 700; color: #1e293b;">
                            <i class="fa fa-user-circle" style="color: #6366f1; font-size: 20px;"></i>
                            ${highlightSearch(profile.profile_name || profile.profile, searchTerm)}
                        </h4>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="background: #e0e7ff; color: #4338ca; padding: 5px 12px; border-radius: 15px; font-size: 12px; font-weight: 600;">${customers.length} عميل</span>
                            <span style="font-weight: 700; font-size: 18px; direction: ltr; text-align: left; color: ${balanceColor};">${fmt(profile.total_balance || 0, 2)}</span>
                        </div>
                    </div>
                    <div class="table-container">
                        <table class="profile-customers-table">
                            <thead>
                                <tr>
                                    <th style="text-align: right;">العميل</th>
                                    <th style="text-align: left; width: 120px;">الرصيد</th>
                                </tr>
                            </thead>
                            <tbody>
            `;

            if (customers.length > 0) {
                customers.forEach((c, i) => {
                    // Positive balance = customer owes us (red/debit), Negative = we owe customer (green/credit)
                    const custBalanceClass = c.balance > 0 ? 'positive' : (c.balance < 0 ? 'negative' : '');
                    html += `
                        <tr style="animation: fadeIn 0.2s ease ${i * 0.02}s both">
                            <td class="cell-name" style="text-align: right;" title="${c.customer_name || c.customer}">
                                <i class="fa fa-user row-icon-inline text-purple"></i>
                                ${highlightSearch(c.customer_name || c.customer, searchTerm)}
                            </td>
                            <td class="cell-number ${custBalanceClass}" style="text-align: left; direction: ltr;">${fmt(c.balance, 2)}</td>
                        </tr>
                    `;
                });
            } else {
                html += `
                    <tr>
                        <td colspan="2" class="empty-row">
                            <div class="empty-state">
                                <i class="fa fa-user-times"></i>
                                <span>لا يوجد عملاء</span>
                            </div>
                        </td>
                    </tr>
                `;
            }

            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        });

        if (!html) {
            html = `
                <div class="data-card">
                    <div class="card-header with-count">
                        <h4>العملاء حسب الموزع</h4>
                        <span class="record-count" id="customer-count">0 عميل</span>
                    </div>
                    <div class="table-container">
                        <table id="tbl-customers">
                            <tbody>
                                <tr><td colspan="2" class="empty-row">
                                    <div class="empty-state">
                                        <i class="fa fa-users"></i>
                                        <span>${searchTerm ? 'لا توجد نتائج للبحث' : 'لا توجد بيانات'}</span>
                                    </div>
                                </td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        $('#customers-container').html(html);
    }

    function renderSuppliers(data, searchTerm = '') {
        suppliersData = data;
        let suppliers = (data.suppliers || []).sort((a, b) => b.balance - a.balance);

        // Filter by search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            suppliers = suppliers.filter(s =>
                (s.supplier_name || s.supplier || '').toLowerCase().includes(term)
            );
        }

        const allSuppliers = data.suppliers || [];
        const total = allSuppliers.reduce((s, c) => s + (c.balance || 0), 0);
        const totalPositive = allSuppliers.reduce((s, c) => s + (c.balance > 0 ? c.balance : 0), 0);
        const totalNegative = allSuppliers.reduce((s, c) => s + (c.balance < 0 ? c.balance : 0), 0);

        $('#chip-suppliers').text(`${fmt(allSuppliers.length)} موردين`);
        $('#supplier-count').text(`${fmt(suppliers.length)} مورد`);
        animateValue($('#summary-supplier'), 0, total);
        animateValue($('#total-supplier-positive'), 0, totalPositive);
        animateValue($('#total-supplier-negative'), 0, totalNegative);

        const html = suppliers.map((s, i) => {
            // Positive balance = we owe supplier (negative/red), Negative = supplier owes us (positive/green)
            const balanceClass = s.balance > 0 ? 'negative' : (s.balance < 0 ? 'positive' : '');
            return `
                <tr style="animation: fadeIn 0.3s ease ${i * 0.02}s both">
                    <td class="cell-name" style="text-align: right;" title="${s.supplier_name || s.supplier}">
                        <i class="fa fa-industry row-icon-inline text-warning"></i>
                        ${highlightSearch(s.supplier_name || s.supplier, searchTerm)}
                    </td>
                    <td class="cell-number ${balanceClass}" style="text-align: left; direction: ltr;">${fmt(s.balance, 2)}</td>
                </tr>
            `;
        }).join('');

        $('#tbl-suppliers tbody').html(html || `<tr><td colspan="2" class="empty-row">
            <div class="empty-state">
                <i class="fa fa-truck"></i>
                <span>${searchTerm ? 'لا توجد نتائج للبحث' : 'لا توجد بيانات'}</span>
            </div>
        </td></tr>`);
    }

    function renderExpenses(expenses, searchTerm = '') {
        expensesData = expenses;
        let rows = expenses.rows || [];
        const total = expenses.total || 0;

        // Filter by search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            rows = rows.filter(r => (r.expense_category || '').toLowerCase().includes(term));
        }

        animateValue($('#expenses-total'), 0, total);

        const { from_date, to_date } = getExpDates();
        $('#expenses-period').text(`${from_date} → ${to_date}`);
        $('#expense-count').text(`${fmt(rows.length)} فئة`);

        const html = rows.map((r, i) => {
            const percentage = total > 0 ? ((r.total / total) * 100).toFixed(1) : 0;
            return `
                <tr style="animation: fadeIn 0.3s ease ${i * 0.03}s both">
                    <td class="cell-name" style="text-align: right;" title="${r.expense_category}">
                        <i class="fa fa-tag row-icon-inline text-danger"></i>
                        ${highlightSearch(r.expense_category, searchTerm)}
                    </td>
                    <td class="cell-number" style="text-align: left; direction: ltr;">${fmt(r.total, 2)}</td>
                    <td class="cell-center">
                        <div class="percentage-cell">
                            <div class="percentage-bar">
                                <div class="percentage-fill" style="width: ${percentage}%"></div>
                            </div>
                            <span class="percentage-text">${percentage}%</span>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        $('#tbl-expenses tbody').html(html || `<tr><td colspan="3" class="empty-row">
            <div class="empty-state">
                <i class="fa fa-money"></i>
                <span>${searchTerm ? 'لا توجد نتائج للبحث' : 'لا توجد بيانات'}</span>
            </div>
        </td></tr>`);
    }

    // Highlight search term in text
    function highlightSearch(text, term) {
        if (!term || !text) return text;
        const regex = new RegExp(`(${term})`, 'gi');
        return text.replace(regex, '<mark class="search-highlight">$1</mark>');
    }

    // ==================== New Section Renderers ====================
    let todaySalesData = null;
    let salesByProfileData = null;
    let lowStockData = null;
    let cashFlowData = null;
    let salesPerformanceData = null;

    function renderTodaySales(data) {
        todaySalesData = data;

        // Update stats
        animateValue($('#today-sales-total'), 0, data.total_today || 0);
        $('#today-sales-count').text(fmt(data.count_today || 0));
        animateValue($('#yesterday-sales-total'), 0, data.total_yesterday || 0);

        // Change indicator
        const change = data.change_percent || 0;
        const changeCard = $('#today-change-card');
        if (change > 0) {
            changeCard.removeClass('negative').addClass('positive');
            $('#today-sales-change').html(`<i class="fa fa-arrow-up"></i> ${fmt(Math.abs(change), 1)}%`);
        } else if (change < 0) {
            changeCard.removeClass('positive').addClass('negative');
            $('#today-sales-change').html(`<i class="fa fa-arrow-down"></i> ${fmt(Math.abs(change), 1)}%`);
        } else {
            changeCard.removeClass('positive negative');
            $('#today-sales-change').text('0%');
        }

        // Top items
        const topItems = data.top_items || [];
        $('#top-items-count').text(`${topItems.length} أصناف`);

        const html = topItems.map((item, i) => `
            <tr style="animation: fadeIn 0.3s ease ${i * 0.05}s both">
                <td class="cell-name" style="text-align: right;">
                    <i class="fa fa-star row-icon-inline text-warning"></i>
                    ${item.item_name || item.item_code}
                </td>
                <td class="cell-number" style="text-align: left; direction: ltr;">${fmt(item.total_qty, 2)}</td>
                <td class="cell-number" style="text-align: left; direction: ltr;">${fmt(item.total_amount, 2)}</td>
            </tr>
        `).join('');

        $('#tbl-top-items tbody').html(html || `<tr><td colspan="3" class="empty-row">
            <div class="empty-state">
                <i class="fa fa-inbox"></i>
                <span>لا توجد مبيعات اليوم</span>
            </div>
        </td></tr>`);
    }

    function renderCashFlow(data) {
        cashFlowData = data;
        const cashIn = data.cash_in || {};
        const cashOut = data.cash_out || {};

        // Cash In
        animateValue($('#cash-in-total'), 0, cashIn.total || 0);

        // Cash Out
        animateValue($('#cash-out-total'), 0, cashOut.total || 0);

        // Net Flow
        const netFlow = data.net_flow || 0;
        const netFlowCard = $('#net-flow-card');
        if (netFlow > 0) {
            netFlowCard.removeClass('negative').addClass('positive');
        } else if (netFlow < 0) {
            netFlowCard.removeClass('positive').addClass('negative');
        } else {
            netFlowCard.removeClass('positive negative');
        }
        animateValue($('#net-flow-value'), 0, netFlow);
    }

    function renderSalesPerformance(data) {
        salesPerformanceData = data;
        const thisMonth = data.this_month || {};
        const lastMonth = data.last_month || {};

        // This month
        animateValue($('#perf-this-month'), 0, thisMonth.total || 0);

        // Last month
        animateValue($('#perf-last-month'), 0, lastMonth.total || 0);

        // Change
        const change = data.change_percent || 0;
        const changeCard = $('#perf-change-card');

        if (change > 0) {
            changeCard.removeClass('negative').addClass('positive');
        } else if (change < 0) {
            changeCard.removeClass('positive').addClass('negative');
        } else {
            changeCard.removeClass('positive negative');
        }
        $('#perf-change-value').text(`${change > 0 ? '+' : ''}${fmt(change, 1)}%`);

        // Weekly trend
        const trend = data.weekly_trend || [];
        const maxVal = Math.max(...trend.map(t => t.total), 1);

        const trendHtml = trend.map(day => {
            const height = (day.total / maxVal) * 100;
            const dayNames = { 'Monday': 'إث', 'Tuesday': 'ثل', 'Wednesday': 'أر', 'Thursday': 'خم', 'Friday': 'جم', 'Saturday': 'سب', 'Sunday': 'أح' };
            const dayLabel = dayNames[day.day_name] || day.day_name?.substring(0, 2) || '';
            return `
                <div class="trend-bar-container">
                    <div class="trend-bar" style="height: ${height}%" title="${fmt(day.total, 2)}"></div>
                    <div class="trend-label">${dayLabel}</div>
                    <div class="trend-value">${fmt(day.total / 1000, 1)}k</div>
                </div>
            `;
        }).join('');

        $('#weekly-trend').html(`<div class="trend-chart">${trendHtml}</div>`);
    }

    function renderSalesByProfile(data, searchTerm = '') {
        salesByProfileData = data;
        let profiles = data.profiles || [];
        const total = data.total || 0;

        // Filter by search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            profiles = profiles.filter(p =>
                (p.profile_name || p.profile || '').toLowerCase().includes(term)
            );
        }

        $('#profile-sales-count').text(`${fmt(profiles.length)} موزع`);

        const html = profiles.map((p, i) => {
            const percentage = p.percentage || 0;
            return `
                <tr style="animation: fadeIn 0.3s ease ${i * 0.03}s both">
                    <td class="cell-name" style="text-align: right;">
                        <i class="fa fa-user row-icon-inline text-primary"></i>
                        ${highlightSearch(p.profile_name || p.profile, searchTerm)}
                    </td>
                    <td class="cell-number" style="text-align: left; direction: ltr;">${fmt(p.total_sales, 2)}</td>
                    <td class="cell-center">
                        <span class="percentage-text">${percentage}%</span>
                    </td>
                </tr>
            `;
        }).join('');

        $('#tbl-profile-sales tbody').html(html || `<tr><td colspan="3" class="empty-row">
            <div class="empty-state">
                <i class="fa fa-users"></i>
                <span>${searchTerm ? 'لا توجد نتائج للبحث' : 'لا توجد بيانات'}</span>
            </div>
        </td></tr>`);
    }

    function renderLowStock(data, searchTerm = '') {
        lowStockData = data;

        // Update badges
        $('#count-negative').text(data.negative_count || 0);
        $('#count-zero').text(data.zero_count || 0);
        $('#count-low').text(data.low_count || 0);

        // Filter function
        const filterItems = (items) => {
            if (!searchTerm) return items;
            const term = searchTerm.toLowerCase();
            return items.filter(item =>
                (item.item_name || item.item_code || '').toLowerCase().includes(term)
            );
        };

        // Render table helper
        const renderTable = (items, tableId, countId) => {
            const filtered = filterItems(items);
            $(countId).text(`${filtered.length} صنف`);

            const html = filtered.map((item, i) => `
                <tr style="animation: fadeIn 0.2s ease ${i * 0.02}s both">
                    <td class="cell-name" style="text-align: right;" title="${item.item_name || item.item_code}">
                        <i class="fa fa-cube row-icon-inline"></i>
                        ${highlightSearch(item.item_name || item.item_code, searchTerm)}
                    </td>
                    <td class="cell-number negative" style="text-align: left; direction: ltr;">${fmt(item.current_qty, 2)}</td>
                </tr>
            `).join('');

            $(tableId + ' tbody').html(html || `<tr><td colspan="2" class="empty-row">
                <div class="empty-state">
                    <i class="fa fa-check-circle"></i>
                    <span>لا يوجد</span>
                </div>
            </td></tr>`);
        };

        renderTable(data.negative_stock || [], '#tbl-negative-stock', '#negative-stock-count');
        renderTable(data.zero_stock || [], '#tbl-zero-stock', '#zero-stock-count');
        renderTable(data.low_stock || [], '#tbl-low-stock', '#low-stock-count');
    }

    // ==================== New Advanced Renderers ====================
    let topCustomersData = null;
    let topSuppliersData = null;
    let profitAnalysisData = null;
    let inventoryTurnoverData = null;
    let monthlyComparisonData = null;
    let agingReportData = null;
    let expectedCollectionsData = null;
    let duePayablesData = null;

    function renderTopCustomers(data) {
        topCustomersData = data;
        const customers = data.customers || [];
        $('#top-customers-count').text(`${customers.length} عميل`);

        const html = customers.map((c, i) => {
            const trendClass = c.trend > 0 ? 'positive' : (c.trend < 0 ? 'negative' : '');
            const trendIcon = c.trend > 0 ? 'fa-arrow-up' : (c.trend < 0 ? 'fa-arrow-down' : 'fa-minus');
            return `
                <tr style="animation: fadeIn 0.3s ease ${i * 0.03}s both">
                    <td class="cell-name" style="text-align: right;">
                        <i class="fa fa-user row-icon-inline text-primary"></i>
                        ${c.customer_name || c.customer}
                    </td>
                    <td class="cell-number" style="text-align: left; direction: ltr;">${fmt(c.total_sales, 2)}</td>
                    <td class="cell-center ${trendClass}">
                        <i class="fa ${trendIcon}"></i> ${fmt(Math.abs(c.trend), 1)}%
                    </td>
                </tr>
            `;
        }).join('');

        $('#tbl-top-customers tbody').html(html || `<tr><td colspan="3" class="empty-row">
            <div class="empty-state"><i class="fa fa-users"></i><span>لا توجد بيانات</span></div>
        </td></tr>`);
    }

    function renderTopSuppliers(data) {
        topSuppliersData = data;
        const suppliers = data.suppliers || [];
        $('#top-suppliers-count').text(`${suppliers.length} مورد`);

        const html = suppliers.map((s, i) => {
            const balanceClass = s.balance > 0 ? 'negative' : (s.balance < 0 ? 'positive' : '');
            return `
                <tr style="animation: fadeIn 0.3s ease ${i * 0.03}s both">
                    <td class="cell-name" style="text-align: right;">
                        <i class="fa fa-industry row-icon-inline text-info"></i>
                        ${s.supplier_name || s.supplier}
                    </td>
                    <td class="cell-number" style="text-align: left; direction: ltr;">${fmt(s.total_purchase, 2)}</td>
                    <td class="cell-number ${balanceClass}" style="text-align: left; direction: ltr;">${fmt(s.balance, 2)}</td>
                </tr>
            `;
        }).join('');

        $('#tbl-top-suppliers tbody').html(html || `<tr><td colspan="3" class="empty-row">
            <div class="empty-state"><i class="fa fa-truck"></i><span>لا توجد بيانات</span></div>
        </td></tr>`);
    }

    function renderProfitAnalysis(data) {
        profitAnalysisData = data;
        const thisMonth = data.this_month || {};
        const topItems = data.top_items || [];

        animateValue($('#profit-revenue'), 0, thisMonth.revenue || 0);
        animateValue($('#profit-cost'), 0, thisMonth.cost || 0);
        animateValue($('#profit-net'), 0, thisMonth.profit || 0);
        $('#profit-margin').text(`${fmt(thisMonth.margin || 0, 1)}%`);

        $('#profitable-items-count').text(`${topItems.length} صنف`);

        const html = topItems.map((item, i) => `
            <tr style="animation: fadeIn 0.3s ease ${i * 0.03}s both">
                <td class="cell-name" style="text-align: right;">
                    <i class="fa fa-diamond row-icon-inline text-warning"></i>
                    ${item.item_name || item.item_code}
                </td>
                <td class="cell-number positive" style="text-align: left; direction: ltr;">${fmt(item.profit, 2)}</td>
                <td class="cell-center">${fmt(item.margin, 1)}%</td>
            </tr>
        `).join('');

        $('#tbl-profitable-items tbody').html(html || `<tr><td colspan="3" class="empty-row">
            <div class="empty-state"><i class="fa fa-diamond"></i><span>لا توجد بيانات</span></div>
        </td></tr>`);
    }

    function renderMonthlyComparison(data) {
        monthlyComparisonData = data;
        const months = data.months || [];
        const maxSales = data.max_sales || 1;

        const html = months.map(m => {
            const height = (m.sales / maxSales) * 100;
            return `
                <div class="month-bar-container ${m.is_current ? 'current' : ''}">
                    <div class="month-value">${fmt(m.sales / 1000, 1)}k</div>
                    <div class="month-bar" style="height: ${height}%"></div>
                    <div class="month-label">${m.month_name}</div>
                </div>
            `;
        }).join('');

        $('#monthly-chart').html(`<div class="monthly-bars">${html}</div>`);
    }

    function renderInventoryTurnover(data, tab = 'fast') {
        inventoryTurnoverData = data;
        const items = tab === 'fast' ? (data.fast_moving || []) : (data.slow_moving || []);

        $('#turnover-count').text(`${items.length} صنف`);

        if (tab === 'fast') {
            $('#turnover-title').html('<i class="fa fa-rocket"></i> الأصناف سريعة الحركة');
        } else {
            $('#turnover-title').html('<i class="fa fa-hourglass"></i> الأصناف بطيئة الحركة');
        }

        const html = items.map((item, i) => `
            <tr style="animation: fadeIn 0.3s ease ${i * 0.03}s both">
                <td class="cell-name" style="text-align: right;">
                    <i class="fa fa-cube row-icon-inline"></i>
                    ${item.item_name || item.item_code}
                </td>
                <td class="cell-number" style="text-align: left; direction: ltr;">${fmt(item.qty_sold, 2)}</td>
                <td class="cell-number" style="text-align: left; direction: ltr;">${fmt(item.current_stock, 2)}</td>
            </tr>
        `).join('');

        $('#tbl-turnover tbody').html(html || `<tr><td colspan="3" class="empty-row">
            <div class="empty-state"><i class="fa fa-cubes"></i><span>لا توجد بيانات</span></div>
        </td></tr>`);
    }

    function renderAgingReport(data) {
        agingReportData = data;
        const totals = data.totals || {};
        const counts = data.counts || {};

        // Update badges
        $('#aging-total-30').text(fmt(totals['0_30'] || 0, 0));
        $('#aging-total-60').text(fmt(totals['31_60'] || 0, 0));
        $('#aging-total-90').text(fmt(totals['61_90'] || 0, 0));
        $('#aging-total-over').text(fmt(totals['over_90'] || 0, 0));

        $('#aging-count-30').text(`${counts['0_30'] || 0} عميل`);
        $('#aging-count-60').text(`${counts['31_60'] || 0} عميل`);
        $('#aging-count-90').text(`${counts['61_90'] || 0} عميل`);
        $('#aging-count-over').text(`${counts['over_90'] || 0} عميل`);

        // Render tables
        const renderAgingTable = (items, tableId) => {
            const html = (items || []).map((c, i) => `
                <tr style="animation: fadeIn 0.2s ease ${i * 0.03}s both">
                    <td class="cell-name" style="text-align: right;">
                        <i class="fa fa-user row-icon-inline"></i>
                        ${c.customer_name || c.customer}
                    </td>
                    <td class="cell-number" style="text-align: left; direction: ltr;">${fmt(c.total_balance, 2)}</td>
                </tr>
            `).join('');
            $(tableId + ' tbody').html(html || '<tr><td colspan="2" class="empty-row">-</td></tr>');
        };

        renderAgingTable(data.aging_0_30, '#tbl-aging-30');
        renderAgingTable(data.aging_31_60, '#tbl-aging-60');
        renderAgingTable(data.aging_61_90, '#tbl-aging-90');
        renderAgingTable(data.aging_over_90, '#tbl-aging-over');
    }

    function renderExpectedCollections(data) {
        expectedCollectionsData = data;
        const customers = data.customers || [];

        animateValue($('#expected-collections-total'), 0, data.total_expected || 0);
        $('#expected-collections-count').text(`${customers.length} عميل`);

        const html = customers.map((c, i) => `
            <tr style="animation: fadeIn 0.3s ease ${i * 0.03}s both">
                <td class="cell-name" style="text-align: right;">
                    <i class="fa fa-user row-icon-inline text-primary"></i>
                    ${c.customer_name || c.customer}
                </td>
                <td class="cell-number" style="text-align: left; direction: ltr;">${fmt(c.balance, 2)}</td>
                <td class="cell-date">${c.last_payment_date || '-'}</td>
            </tr>
        `).join('');

        $('#tbl-expected-collections tbody').html(html || `<tr><td colspan="3" class="empty-row">
            <div class="empty-state"><i class="fa fa-check-circle"></i><span>لا توجد مستحقات</span></div>
        </td></tr>`);
    }

    function renderDuePayables(data) {
        duePayablesData = data;
        const suppliers = data.suppliers || [];

        animateValue($('#due-payables-total'), 0, data.total_due || 0);
        $('#due-payables-count').text(`${suppliers.length} مورد`);

        const html = suppliers.map((s, i) => `
            <tr style="animation: fadeIn 0.3s ease ${i * 0.03}s both">
                <td class="cell-name" style="text-align: right;">
                    <i class="fa fa-truck row-icon-inline text-warning"></i>
                    ${s.supplier_name || s.supplier}
                </td>
                <td class="cell-number negative" style="text-align: left; direction: ltr;">${fmt(s.balance, 2)}</td>
                <td class="cell-date">${s.last_invoice_date || '-'}</td>
            </tr>
        `).join('');

        $('#tbl-due-payables tbody').html(html || `<tr><td colspan="3" class="empty-row">
            <div class="empty-state"><i class="fa fa-check-circle"></i><span>لا توجد التزامات</span></div>
        </td></tr>`);
    }

    // ==================== Main Refresh ====================
    async function refreshAll() {
        showLoading();
        try {
            const [
                stock, payments, customers, suppliers, expenses,
                salesSummary, purchaseSummary,
                todaySales, salesByProfile, lowStock, cashFlow, salesPerformance,
                topCustomers, topSuppliers, profitAnalysis, inventoryTurnover,
                monthlyComparison, agingReport, expectedCollections,
                duePayables
            ] = await Promise.all([
                fetchStock(),
                fetchPayments(),
                fetchCustomers(),
                fetchSuppliers(),
                fetchExpenses(),
                fetchSalesSummary(),
                fetchPurchaseSummary(),
                fetchTodaySales(),
                fetchSalesByProfile(),
                fetchLowStock(),
                fetchDailyCashFlow(),
                fetchSalesPerformance(),
                fetchTopCustomers(),
                fetchTopSuppliers(),
                fetchProfitAnalysis(),
                fetchInventoryTurnover(),
                fetchMonthlyComparison(),
                fetchAgingReport(),
                fetchExpectedCollections(),
                fetchDuePayables()
            ]);
            renderStock(stock);
            renderPayments(payments);
            renderCustomers(customers);
            renderSuppliers(suppliers);
            renderExpenses(expenses);
            renderSalesSummary(salesSummary);
            renderPurchaseSummary(purchaseSummary);
            renderTodaySales(todaySales);
            renderSalesByProfile(salesByProfile);
            renderLowStock(lowStock);
            renderCashFlow(cashFlow);
            renderSalesPerformance(salesPerformance);
            renderTopCustomers(topCustomers);
            renderTopSuppliers(topSuppliers);
            renderProfitAnalysis(profitAnalysis);
            renderInventoryTurnover(inventoryTurnover);
            renderMonthlyComparison(monthlyComparison);
            renderAgingReport(agingReport);
            renderExpectedCollections(expectedCollections);
            renderDuePayables(duePayables);
        } catch(e) {
            console.error(e);
            showToast('حدث خطأ أثناء تحديث البيانات', 'error');
            frappe.msgprint({
                title: __('خطأ'),
                message: __('حدث خطأ أثناء تحديث البيانات: ') + e.message,
                indicator: 'red'
            });
        } finally {
            hideLoading();
        }
    }

    async function refreshExpenses() {
        try {
            const expenses = await fetchExpenses();
            renderExpenses(expenses, $('#expense-search').val());
        } catch(e) {
            console.error(e);
            showToast('خطأ في تحميل المصروفات', 'error');
        }
    }

    // ==================== Event Handlers ====================

    // Search handlers with debounce
    let searchTimeout;
    function handleSearch(inputId, clearId, renderFn, dataKey) {
        $(wrapper).on('input', inputId, function() {
            const term = $(this).val();
            $(clearId).toggle(term.length > 0);

            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const data = {
                    stock: stockData,
                    payments: paymentsData,
                    customers: customersData,
                    suppliers: suppliersData,
                    expenses: expensesData,
                    profileSales: salesByProfileData,
                    lowStock: lowStockData
                }[dataKey];

                if (data) renderFn(data, term);
            }, 200);
        });

        $(wrapper).on('click', clearId, function() {
            $(inputId).val('').trigger('input');
        });
    }

    handleSearch('#stock-search', '#clear-stock-search', renderStock, 'stock');
    handleSearch('#payment-search', '#clear-payment-search', renderPayments, 'payments');
    handleSearch('#customer-search', '#clear-customer-search', renderCustomers, 'customers');
    handleSearch('#supplier-search', '#clear-supplier-search', renderSuppliers, 'suppliers');
    handleSearch('#expense-search', '#clear-expense-search', renderExpenses, 'expenses');
    handleSearch('#profile-sales-search', '#clear-profile-sales-search', renderSalesByProfile, 'profileSales');
    handleSearch('#low-stock-search', '#clear-low-stock-search', renderLowStock, 'lowStock');

    // Hide clear buttons initially
    $('.clear-search').hide();

    // Inventory Turnover Tab handler
    $(wrapper).on('click', '.turnover-tab', function() {
        const tab = $(this).data('tab');
        $('.turnover-tab').removeClass('active');
        $(this).addClass('active');
        if (inventoryTurnoverData) {
            renderInventoryTurnover(inventoryTurnoverData, tab);
        }
    });

    // Period filter handlers
    $(wrapper).on('click', '.period-btn', function() {
        const range = $(this).data('range');

        if (range === 'custom') {
            openCustomDialog();
        } else {
            expRangeKey = range;
            updateExpChips();
            refreshExpenses();
        }
    });

    // Custom dialog handlers
    function openCustomDialog() {
        const [defFrom, defTo] = ranges('this_month');
        $('#date-from').val(expCustom?.from || defFrom);
        $('#date-to').val(expCustom?.to || defTo);
        $('#custom-dialog').addClass('visible');
    }

    function closeCustomDialog() {
        $('#custom-dialog').removeClass('visible');
    }

    $(wrapper).on('click', '#dialog-close, #dialog-cancel', closeCustomDialog);

    $(wrapper).on('click', '#dialog-apply', function() {
        const from = $('#date-from').val();
        const to = $('#date-to').val();

        if (!from || !to) {
            showToast('يرجى اختيار تاريخي البداية والنهاية', 'warning');
            return;
        }
        if (new Date(from) > new Date(to)) {
            showToast('تاريخ البداية يجب أن يكون قبل تاريخ النهاية', 'error');
            return;
        }

        expRangeKey = 'custom';
        expCustom = { from, to };
        closeCustomDialog();
        updateExpChips();
        refreshExpenses();
    });

    // Quick range buttons in dialog
    $(wrapper).on('click', '.quick-range-btn', function() {
        const days = $(this).data('days');
        const to = new Date();
        const from = new Date();
        from.setDate(from.getDate() - days);
        $('#date-from').val(toISO(from));
        $('#date-to').val(toISO(to));
    });

    // Close dialog on overlay click
    $(wrapper).on('click', '#custom-dialog', function(e) {
        if (e.target === this) {
            closeCustomDialog();
        }
    });

    // Keyboard shortcuts
    $(document).on('keydown', function(e) {
        if (e.key === 'Escape') {
            closeCustomDialog();
        }
        if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            refreshAll();
        }
    });

    // ==================== Header Buttons ====================
    $(wrapper).on('click', '#btn-refresh', function() {
        refreshAll();
    });

    $(wrapper).on('click', '#btn-print', function() {
        window.print();
    });

    // Company filter change handler
    $(wrapper).on('change', '#company-select', function() {
        selectedCompany = $(this).val() || null;
        refreshAll();
    });

    // ==================== Initialize ====================
    animateOnLoad();
    updateExpChips();

    // Load companies first, then refresh all data
    loadCompanies().then(() => {
        refreshAll();
    });
};
