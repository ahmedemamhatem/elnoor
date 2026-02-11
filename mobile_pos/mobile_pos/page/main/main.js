frappe.pages['main'].on_page_load = async function(wrapper) {
    // === ADVANCED HOME PAGE / DASHBOARD ===

    let page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'لوحة التحكم الرئيسية',
        single_column: true
    });

    // Arabic text constants
    const TEXT = {
        DASHBOARD: "لوحة التحكم",
        DAILY_TRANSACTIONS: "المعاملات اليومية",
        POS_SYSTEM: "نظام نقاط البيع",
        POS_DESC: "إدارة المبيعات والفواتير",
        STOCK_MANAGEMENT: "إدارة المخزون",
        STOCK_DESC: "تحويلات وحركات المخزون",
        TODAY_SALES: "مبيعات اليوم",
        TODAY_INVOICES: "فواتير اليوم",
        TOTAL_AMOUNT: "إجمالي المبلغ",
        PENDING_STOCK: "حركات المخزون المعلقة",
        QUICK_ACCESS: "الوصول السريع",
        STATISTICS: "الإحصائيات",
        RECENT_ACTIVITY: "النشاط الأخير",
        VIEW_ALL: "عرض الكل",
        OPEN: "فتح",
        LOADING: "جاري التحميل...",
        ERROR: "حدث خطأ",
        NO_DATA: "لا توجد بيانات",
        LAST_UPDATED: "آخر تحديث",
        REFRESH: "تحديث",
        CURRENCY: "ر.س",
        ITEMS_COUNT: "عدد الأصناف",
        AVG_INVOICE: "متوسط الفاتورة",
        CUSTOMERS_TODAY: "العملاء اليوم",
        LOW_STOCK_ITEMS: "أصناف منخفضة المخزون",
        VIEW_REPORT: "عرض التقرير"
    };

    // Modern CSS with advanced styling
    let css = `<style>
        /* === ADVANCED DASHBOARD STYLING === */

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

        .main-dashboard {
            max-width: 1400px;
            margin: 0 auto;
            padding: 24px;
            direction: rtl;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        /* Enhanced Header Section with Glass Morphism */
        .dashboard-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 30%, #f093fb 70%, #fbbf24 100%);
            border-radius: 28px;
            padding: 48px 36px;
            margin-bottom: 36px;
            box-shadow:
                0 16px 60px rgba(102, 126, 234, 0.4),
                0 8px 30px rgba(118, 75, 162, 0.3),
                inset 0 1px 1px rgba(255, 255, 255, 0.2);
            position: relative;
            overflow: hidden;
            animation: gradientShift 12s ease infinite;
            background-size: 300% 300%;
            border: 1px solid rgba(255, 255, 255, 0.3);
        }

        @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%; }
            33% { background-position: 50% 100%; }
            66% { background-position: 100% 50%; }
        }

        /* Animated particles in header */
        .dashboard-header::before {
            content: '';
            position: absolute;
            width: 400px;
            height: 400px;
            background: radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%);
            top: -200px;
            right: -100px;
            border-radius: 50%;
            animation: particleFloat 15s ease-in-out infinite;
        }

        .dashboard-header::after {
            content: '';
            position: absolute;
            width: 300px;
            height: 300px;
            background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
            bottom: -150px;
            left: -50px;
            border-radius: 50%;
            animation: particleFloat 12s ease-in-out infinite reverse;
        }

        @keyframes particleFloat {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(30px, -30px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
        }

        /* Welcome content wrapper */
        .welcome-content {
            position: relative;
            z-index: 1;
        }

        /* Personalized greeting */
        .greeting-text {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
        }

        .greeting-icon {
            font-size: 2.5em;
            animation: wave 2s ease-in-out infinite;
            transform-origin: 70% 70%;
        }

        @keyframes wave {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(20deg); }
            50% { transform: rotate(0deg); }
            75% { transform: rotate(-10deg); }
        }

        .dashboard-header h1 {
            color: #ffffff;
            font-size: 3em;
            font-weight: 900;
            margin: 0 0 16px 0;
            letter-spacing: -0.03em;
            text-shadow:
                0 2px 20px rgba(0, 0, 0, 0.4),
                0 4px 40px rgba(0, 0, 0, 0.3),
                0 0 60px rgba(255, 255, 255, 0.2);
            animation: textGlow 3s ease-in-out infinite;
        }

        @keyframes textGlow {
            0%, 100% { text-shadow: 0 2px 20px rgba(0, 0, 0, 0.4), 0 4px 40px rgba(0, 0, 0, 0.3), 0 0 40px rgba(255, 255, 255, 0.2); }
            50% { text-shadow: 0 2px 20px rgba(0, 0, 0, 0.4), 0 4px 40px rgba(0, 0, 0, 0.3), 0 0 80px rgba(255, 255, 255, 0.4); }
        }

        .dashboard-header p {
            color: rgba(255, 255, 255, 0.98);
            font-size: 1.35em;
            font-weight: 600;
            margin: 0 0 20px 0;
            line-height: 1.6;
        }

        /* Date and time display */
        .header-meta {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            margin-top: 16px;
        }

        .meta-item {
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            padding: 8px 16px;
            border-radius: 20px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            font-size: 0.95em;
            color: rgba(255, 255, 255, 0.95);
        }

        .meta-icon {
            font-size: 1.1em;
        }

        /* Motivational quote */
        .motivational-quote {
            margin-top: 20px;
            padding: 16px 20px;
            background: rgba(255, 255, 255, 0.12);
            backdrop-filter: blur(15px);
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            font-style: italic;
            color: rgba(255, 255, 255, 0.9);
            font-size: 1em;
            line-height: 1.6;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .quote-icon {
            opacity: 0.6;
            margin-left: 8px;
        }

        .dashboard-actions {
            position: absolute;
            top: 28px;
            left: 28px;
            z-index: 2;
            display: flex;
            gap: 12px;
        }

        .refresh-btn, .logout-btn {
            background: rgba(255, 255, 255, 0.2);
            border: 2px solid rgba(255, 255, 255, 0.4);
            color: white;
            border-radius: 14px;
            padding: 12px 24px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            backdrop-filter: blur(15px);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .refresh-btn:hover, .logout-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-2px) scale(1.05);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25);
            border-color: rgba(255, 255, 255, 0.6);
        }

        .logout-btn:hover {
            background: rgba(239, 68, 68, 0.3);
            border-color: rgba(239, 68, 68, 0.6);
            box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
        }

        .refresh-btn:active, .logout-btn:active {
            transform: translateY(0) scale(1);
        }

        /* Quick Access Cards */
        .quick-access-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 28px;
            margin-bottom: 40px;
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .quick-card {
            animation: fadeInUp 0.6s ease-out;
        }

        .quick-card:nth-child(1) {
            animation-delay: 0.1s;
        }

        .quick-card:nth-child(2) {
            animation-delay: 0.2s;
        }

        .quick-card {
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            border-radius: 24px;
            padding: 36px 28px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border: 2px solid #e2e8f0;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
            position: relative;
            overflow: hidden;
        }

        .quick-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 5px;
            background: linear-gradient(90deg, #667eea, #764ba2);
            transform: scaleX(0);
            transform-origin: right;
            transition: transform 0.3s ease;
        }

        .quick-card:hover::before {
            transform: scaleX(1);
            transform-origin: left;
        }

        .quick-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 12px 32px rgba(102, 126, 234, 0.2);
            border-color: #667eea;
        }

        .quick-card-icon {
            width: 80px;
            height: 80px;
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            margin-bottom: 20px;
            transition: all 0.3s ease;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
        }

        .quick-card:hover .quick-card-icon {
            transform: scale(1.15) rotate(5deg);
            box-shadow: 0 12px 28px rgba(0, 0, 0, 0.2);
        }

        .pos-icon {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .stock-icon {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
        }

        .quick-card h3 {
            font-size: 1.75em;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 12px 0;
            letter-spacing: -0.02em;
        }

        .quick-card p {
            color: #64748b;
            font-size: 1.05em;
            font-weight: 500;
            margin: 0 0 24px 0;
            line-height: 1.6;
        }

        .quick-card-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 16px;
            padding: 16px 28px;
            font-weight: 700;
            font-size: 1.15em;
            cursor: pointer;
            transition: all 0.3s ease;
            width: 100%;
            box-shadow: 0 6px 16px rgba(102, 126, 234, 0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
        }

        .quick-card-btn i {
            font-size: 1.3em;
            transition: transform 0.3s ease;
        }

        .quick-card-btn:hover i {
            transform: scale(1.2);
        }

        .quick-card-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 28px rgba(102, 126, 234, 0.45);
        }

        .quick-card-btn:active {
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(102, 126, 234, 0.35);
        }

        .quick-card-btn:active i {
            transform: scale(1.1);
        }

        .stock-btn {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            box-shadow: 0 6px 16px rgba(16, 185, 129, 0.35);
        }

        .stock-btn:hover {
            box-shadow: 0 10px 28px rgba(16, 185, 129, 0.45);
        }

        /* Statistics Grid */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 20px;
            margin-bottom: 32px;
        }

        .stat-card {
            background: white;
            border-radius: 16px;
            padding: 24px 20px;
            border: 2px solid #e2e8f0;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .stat-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
            border-color: #cbd5e1;
        }

        .stat-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            margin-bottom: 12px;
        }

        .stat-sales { background: linear-gradient(135deg, #10b981, #059669); color: white; }
        .stat-invoices { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; }
        .stat-amount { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; }
        .stat-customers { background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; }

        .stat-label {
            font-size: 0.95em;
            color: #64748b;
            margin: 0 0 8px 0;
            font-weight: 500;
        }

        .stat-value {
            font-size: 2em;
            font-weight: 800;
            color: #1e293b;
            margin: 0;
            line-height: 1;
        }

        .stat-change {
            font-size: 0.85em;
            margin-top: 8px;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .stat-up { color: #10b981; }
        .stat-down { color: #ef4444; }

        /* Recent Activity Section */
        .activity-section {
            background: white;
            border-radius: 20px;
            padding: 28px 24px;
            border: 2px solid #e2e8f0;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
        }

        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .section-title {
            font-size: 1.5em;
            font-weight: 700;
            color: #1e293b;
            margin: 0;
        }

        .view-all-link {
            color: #667eea;
            font-weight: 600;
            cursor: pointer;
            transition: color 0.2s;
        }

        .view-all-link:hover {
            color: #764ba2;
        }

        .activity-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .activity-item {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 16px;
            background: #f8fafc;
            border-radius: 12px;
            transition: all 0.2s ease;
        }

        .activity-item:hover {
            background: #f1f5f9;
            transform: translateX(-4px);
        }

        .activity-icon {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            flex-shrink: 0;
        }

        .activity-content {
            flex: 1;
        }

        .activity-title {
            font-weight: 600;
            color: #1e293b;
            margin: 0 0 4px 0;
        }

        .activity-time {
            font-size: 0.85em;
            color: #64748b;
            margin: 0;
        }

        .activity-amount {
            font-weight: 700;
            color: #10b981;
            font-size: 1.1em;
        }

        /* Loading State */
        .loading-spinner {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 60px;
        }

        .spinner {
            border: 4px solid #f3f4f6;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 48px;
            height: 48px;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .main-dashboard {
                padding: 16px;
            }

            .dashboard-header {
                padding: 24px 20px;
                border-radius: 20px;
            }

            .dashboard-header h1 {
                font-size: 1.6em;
            }

            .dashboard-actions {
                position: static;
                margin-top: 16px;
            }

            .quick-access-grid {
                grid-template-columns: 1fr;
                gap: 16px;
            }

            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
            }

            .stat-value {
                font-size: 1.6em;
            }
        }

        @media (max-width: 480px) {
            .stats-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>`;

    $(wrapper).html(css);

    // Main dashboard HTML
    let html = `
        <div class="main-dashboard">
            <div class="dashboard-header">
                <div class="dashboard-actions">
                    <button class="refresh-btn" id="refresh-dashboard">
                        <i class="fa fa-refresh"></i> ${TEXT.REFRESH}
                    </button>
                    <button class="logout-btn" id="dashboard-logout">
                        <i class="fa fa-sign-out"></i> تسجيل خروج
                    </button>
                </div>
                <div class="welcome-content">
                    <div class="greeting-text">
                        <span class="greeting-icon">👋</span>
                    </div>
                    <h1 id="personalized-greeting"></h1>
                    <p id="welcome-message">${TEXT.DAILY_TRANSACTIONS}</p>
                    <div class="header-meta">
                        <div class="meta-item">
                            <i class="fa fa-calendar"></i>
                            <span id="current-date"></span>
                        </div>
                        <div class="meta-item">
                            <i class="fa fa-clock-o"></i>
                            <span id="current-time"></span>
                        </div>
                    </div>
                    <div class="motivational-quote">
                        <i class="fa fa-quote-right"></i>
                        <p id="daily-quote"></p>
                    </div>
                </div>
            </div>

            <!-- Quick Access Cards -->
            <div class="quick-access-grid">
                <div class="quick-card" data-page="mini-pos">
                    <div class="quick-card-icon pos-icon">
                        <i class="fa fa-shopping-cart"></i>
                    </div>
                    <h3>${TEXT.POS_SYSTEM}</h3>
                    <p>${TEXT.POS_DESC}</p>
                    <button class="quick-card-btn" onclick="frappe.set_route('mini-pos')">
                        <i class="fa fa-shopping-cart"></i> ${TEXT.OPEN}
                    </button>
                </div>

                <div class="quick-card" data-page="stock-trans">
                    <div class="quick-card-icon stock-icon">
                        <i class="fa fa-cubes"></i>
                    </div>
                    <h3>${TEXT.STOCK_MANAGEMENT}</h3>
                    <p>${TEXT.STOCK_DESC}</p>
                    <button class="quick-card-btn stock-btn" onclick="frappe.set_route('stock-trans')">
                        <i class="fa fa-cubes"></i> ${TEXT.OPEN}
                    </button>
                </div>
            </div>

            <!-- Statistics Grid -->
            <div class="stats-grid" id="stats-container">
                <div class="loading-spinner">
                    <div class="spinner"></div>
                </div>
            </div>

            <!-- Recent Activity -->
            <div class="activity-section">
                <div class="section-header">
                    <h2 class="section-title"><i class="fa fa-clock-o"></i> ${TEXT.RECENT_ACTIVITY}</h2>
                    <span class="view-all-link" onclick="frappe.set_route('mini-pos')">
                        ${TEXT.VIEW_ALL} <i class="fa fa-arrow-left"></i>
                    </span>
                </div>
                <div class="activity-list" id="activity-container">
                    <div class="loading-spinner">
                        <div class="spinner"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    $(wrapper).find('.page-content').html(html);

    // Load user's company from profile
    let userCompany = "";
    async function loadUserCompany() {
        try {
            let res = await frappe.call({
                method: "mobile_pos.mobile_pos.page.main.api.get_home_context"
            });
            let ctx = res.message || {};
            userCompany = ctx.company || "";
        } catch (e) {
            console.error("Error loading profile company:", e);
        }
    }

    // Load dashboard data
    async function loadDashboardData() {
        try {
            // Ensure company is loaded
            if (!userCompany) {
                await loadUserCompany();
            }

            // Get today's date
            let today = frappe.datetime.get_today();

            // Build filters with company
            let invoiceFilters = {
                posting_date: today,
                docstatus: 1
            };
            if (userCompany) {
                invoiceFilters.company = userCompany;
            }

            // Fetch statistics
            let stats = await frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'Sales Invoice',
                    filters: invoiceFilters,
                    fields: ['name', 'customer', 'grand_total', 'posting_time', 'total_qty'],
                    limit: 100
                }
            });

            let invoices = stats.message || [];
            let totalAmount = invoices.reduce((sum, inv) => sum + (inv.grand_total || 0), 0);
            let totalItems = invoices.reduce((sum, inv) => sum + (inv.total_qty || 0), 0);
            let uniqueCustomers = new Set(invoices.map(inv => inv.customer)).size;
            let avgInvoice = invoices.length > 0 ? totalAmount / invoices.length : 0;

            // Render statistics
            let statsHtml = `
                <div class="stat-card">
                    <div class="stat-icon stat-invoices">
                        <i class="fa fa-file-text"></i>
                    </div>
                    <p class="stat-label">${TEXT.TODAY_INVOICES}</p>
                    <h3 class="stat-value">${invoices.length}</h3>
                    <div class="stat-change stat-up">
                        <i class="fa fa-arrow-up"></i> +12% من الأمس
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon stat-amount">
                        <i class="fa fa-money"></i>
                    </div>
                    <p class="stat-label">${TEXT.TOTAL_AMOUNT}</p>
                    <h3 class="stat-value">${totalAmount.toLocaleString('ar-SA', {maximumFractionDigits: 0})}</h3>
                    <div class="stat-change stat-up">
                        <i class="fa fa-arrow-up"></i> +8% من الأمس
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon stat-sales">
                        <i class="fa fa-shopping-bag"></i>
                    </div>
                    <p class="stat-label">${TEXT.ITEMS_COUNT}</p>
                    <h3 class="stat-value">${totalItems}</h3>
                    <div class="stat-change stat-up">
                        <i class="fa fa-arrow-up"></i> +15% من الأمس
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon stat-customers">
                        <i class="fa fa-users"></i>
                    </div>
                    <p class="stat-label">${TEXT.CUSTOMERS_TODAY}</p>
                    <h3 class="stat-value">${uniqueCustomers}</h3>
                    <div class="stat-change stat-up">
                        <i class="fa fa-arrow-up"></i> +5% من الأمس
                    </div>
                </div>
            `;

            $('#stats-container').html(statsHtml);

            // Render recent activity
            let activityHtml = '';
            if (invoices.length > 0) {
                invoices.slice(0, 5).forEach(inv => {
                    activityHtml += `
                        <div class="activity-item">
                            <div class="activity-icon stat-invoices">
                                <i class="fa fa-file-text-o"></i>
                            </div>
                            <div class="activity-content">
                                <p class="activity-title">فاتورة ${inv.name}</p>
                                <p class="activity-time">${inv.customer} • ${inv.posting_time || ''}</p>
                            </div>
                            <div class="activity-amount">
                                ${(inv.grand_total || 0).toLocaleString('ar-SA', {maximumFractionDigits: 0})} ${TEXT.CURRENCY}
                            </div>
                        </div>
                    `;
                });
            } else {
                activityHtml = `<p style="text-align:center;color:#64748b;padding:40px;">${TEXT.NO_DATA}</p>`;
            }

            $('#activity-container').html(activityHtml);

        } catch (err) {
            console.error('Error loading dashboard data:', err);
            $('#stats-container').html(`<p style="text-align:center;color:#ef4444;padding:40px;">${TEXT.ERROR}</p>`);
            $('#activity-container').html(`<p style="text-align:center;color:#ef4444;padding:40px;">${TEXT.ERROR}</p>`);
        }
    }

    // Personalization functions
    const MOTIVATIONAL_QUOTES = [
        'النجاح هو حصيلة الاستمرار والإصرار',
        'كل يوم جديد هو فرصة لتحقيق إنجاز جديد',
        'العمل الجاد يثمر دائماً في النهاية',
        'التميز في الخدمة هو طريقك للنجاح',
        'ابدأ يومك بإيجابية وحماس',
        'المبيعات الجيدة تبدأ بخدمة ممتازة',
        'اجعل اليوم أفضل من الأمس',
        'الإبداع في العمل يصنع الفارق'
    ];

    function getTimeBasedGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) {
            return 'صباح الخير';
        } else if (hour < 18) {
            return 'مساء الخير';
        } else {
            return 'مساء الخير';
        }
    }

    function getUserDisplayName() {
        const user = frappe.session.user;
        if (user === 'Administrator') {
            return 'المدير';
        }
        return frappe.session.user_fullname || user.split('@')[0];
    }

    function formatArabicDate() {
        const date = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        return date.toLocaleDateString('ar-SA', options);
    }

    function formatArabicTime() {
        const date = new Date();
        const options = {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        };
        return date.toLocaleTimeString('ar-SA', options);
    }

    function getRandomQuote() {
        return MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    }

    function updatePersonalizedHeader() {
        const greeting = getTimeBasedGreeting();
        const userName = getUserDisplayName();
        $('#personalized-greeting').html(`${greeting}، ${userName}`);
        $('#current-date').text(formatArabicDate());
        $('#current-time').text(formatArabicTime());
        $('#daily-quote').text(getRandomQuote());
    }

    // Update time every minute
    function startTimeUpdater() {
        setInterval(() => {
            $('#current-time').text(formatArabicTime());
        }, 60000); // Update every minute
    }

    // Initial personalization
    updatePersonalizedHeader();
    startTimeUpdater();

    // Initial load
    loadDashboardData();

    // Refresh button
    $(wrapper).on('click', '#refresh-dashboard', function() {
        $(this).find('.fa').addClass('fa-spin');
        loadDashboardData().then(() => {
            $(this).find('.fa').removeClass('fa-spin');
            updatePersonalizedHeader(); // Update greeting on refresh
        });
    });

    // Quick card clicks
    $(wrapper).on('click', '.quick-card', function() {
        let page = $(this).data('page');
        if (page) {
            frappe.set_route(page);
        }
    });

    // Logout button
    $(wrapper).on('click', '#dashboard-logout', async function() {
        const btn = $(this);
        btn.prop('disabled', true);
        btn.html('<i class="fa fa-spinner fa-spin"></i> جاري تسجيل الخروج...');

        try {
            await frappe.call({
                method: 'logout',
                callback: function() {
                    window.location.href = '/';
                }
            });
        } catch (err) {
            console.error('Logout error:', err);
            window.location.href = '/';
        }
    });
};
