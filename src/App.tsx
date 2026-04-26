import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { TranslationProvider } from "@/contexts/TranslationContext";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import AccountPage from "./pages/AccountPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import SearchPage from "./pages/SearchPage";
import VendorRegisterPage from "./pages/VendorRegisterPage";
import VendorStorePage from "./pages/VendorStorePage";
import NotFound from "./pages/NotFound";

// Static pages
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import CookiePolicyPage from "./pages/CookiePolicyPage";
import TermsPage from "./pages/TermsPage";
import AboutPage from "./pages/AboutPage";
import HelpCenterPage from "./pages/HelpCenterPage";
import ContactPage from "./pages/ContactPage";
import DeliveryPage from "./pages/DeliveryPage";
import ReturnPolicyPage from "./pages/ReturnPolicyPage";

// Admin
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminVendors from "./pages/admin/AdminVendors";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminBulkImport from "./pages/admin/AdminBulkImport";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminWithdrawals from "./pages/admin/AdminWithdrawals";
import AdminAnalyticsPage from "./pages/admin/AdminAnalyticsPage";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminTeam from "./pages/admin/AdminTeam";
import AdminMarketing from "./pages/admin/AdminMarketing";
import AdminResources from "./pages/admin/AdminResources";
import AdminDocumentation from "./pages/admin/AdminDocumentation";
import RequirePermission from "./components/admin/RequirePermission";
import { PERMISSIONS } from "./lib/permissions";
import CookieConsent from "./components/shared/CookieConsent";

// Vendor
import VendorLayout from "./components/vendor/VendorLayout";
import VendorDashboard from "./pages/vendor/VendorDashboard";
import VendorProducts from "./pages/vendor/VendorProducts";
import AddProductPage from "./pages/vendor/AddProductPage";
import VendorOrders from "./pages/vendor/VendorOrders";
import VendorEarnings from "./pages/vendor/VendorEarnings";
import VendorNotifications from "./pages/vendor/VendorNotifications";
import VendorSettings from "./pages/vendor/VendorSettings";
import VendorBulkImport from "./pages/vendor/VendorBulkImport";
import VendorMessages from "./pages/vendor/VendorMessages";
import EditProductPage from "./pages/vendor/EditProductPage";
import AdminMessages from "./pages/admin/AdminMessages";
import AdminEvidence from "./pages/admin/AdminEvidence";
import AdminMedia from "./pages/admin/AdminMedia";
import VendorMedia from "./pages/vendor/VendorMedia";
import VendorResources from "./pages/vendor/VendorResources";
import VendorResourceCategory from "./pages/vendor/VendorResourceCategory";
import VendorResourceDetail from "./pages/vendor/VendorResourceDetail";
import ShortLinkRedirect from "./pages/ShortLinkRedirect";
import OrderChatPage from "./pages/OrderChatPage";
import EmailUnsubscribePage from "./pages/EmailUnsubscribePage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <TranslationProvider>
          <AuthProvider>
            <CartProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/order-confirmation/:orderId" element={<OrderConfirmationPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/orders/:orderId/chat" element={<OrderChatPage />} />
                <Route path="/product/:slug" element={<ProductDetailPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/category/:slug" element={<SearchPage />} />
                <Route path="/vendor/register" element={<VendorRegisterPage />} />
                <Route path="/store/:slug" element={<VendorStorePage />} />
                <Route path="/s/:code" element={<ShortLinkRedirect />} />
                <Route path="/unsubscribe" element={<EmailUnsubscribePage />} />

                {/* Static pages */}
                <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
                <Route path="/cookie-policy" element={<CookiePolicyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/help" element={<HelpCenterPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/delivery" element={<DeliveryPage />} />
                <Route path="/return-policy" element={<ReturnPolicyPage />} />

                {/* Admin routes */}
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<RequirePermission perm={PERMISSIONS.DASHBOARD_VIEW}><AdminDashboard /></RequirePermission>} />
                  <Route path="vendors" element={<RequirePermission perm={PERMISSIONS.VENDORS_VIEW}><AdminVendors /></RequirePermission>} />
                  <Route path="products" element={<RequirePermission perm={PERMISSIONS.PRODUCTS_VIEW}><AdminProducts /></RequirePermission>} />
                  <Route path="orders" element={<RequirePermission perm={PERMISSIONS.ORDERS_VIEW}><AdminOrders /></RequirePermission>} />
                  <Route path="users" element={<RequirePermission perm={PERMISSIONS.USERS_VIEW}><AdminUsers /></RequirePermission>} />
                  <Route path="categories" element={<RequirePermission perm={PERMISSIONS.CATEGORIES_MANAGE}><AdminCategories /></RequirePermission>} />
                  <Route path="bulk-import" element={<RequirePermission perm={PERMISSIONS.BULK_IMPORT_USE}><AdminBulkImport /></RequirePermission>} />
                  <Route path="media" element={<RequirePermission perm={PERMISSIONS.MEDIA_MANAGE}><AdminMedia /></RequirePermission>} />
                  <Route path="withdrawals" element={<RequirePermission perm={PERMISSIONS.WITHDRAWALS_VIEW}><AdminWithdrawals /></RequirePermission>} />
                  <Route path="analytics" element={<RequirePermission perm={PERMISSIONS.ANALYTICS_VIEW}><AdminAnalyticsPage /></RequirePermission>} />
                  <Route path="subscriptions" element={<RequirePermission perm={PERMISSIONS.SUBSCRIPTIONS_VIEW}><AdminSubscriptions /></RequirePermission>} />
                  <Route path="notifications" element={<RequirePermission perm={PERMISSIONS.NOTIFICATIONS_SEND}><AdminNotifications /></RequirePermission>} />
                  <Route path="messages" element={<RequirePermission perm={PERMISSIONS.MESSAGES_VIEW}><AdminMessages /></RequirePermission>} />
                  <Route path="evidence" element={<RequirePermission perm={PERMISSIONS.EVIDENCE_VIEW}><AdminEvidence /></RequirePermission>} />
                  <Route path="team" element={<RequirePermission perm={PERMISSIONS.TEAM_MANAGE}><AdminTeam /></RequirePermission>} />
                  <Route path="settings" element={<RequirePermission perm={PERMISSIONS.SETTINGS_MANAGE}><AdminSettings /></RequirePermission>} />
                  <Route path="marketing" element={<RequirePermission perm={PERMISSIONS.MARKETING_MANAGE}><AdminMarketing /></RequirePermission>} />
                  <Route path="resources" element={<RequirePermission perm={PERMISSIONS.RESOURCES_MANAGE}><AdminResources /></RequirePermission>} />
                  <Route path="documentation" element={<RequirePermission perm={PERMISSIONS.DOCUMENTATION_VIEW}><AdminDocumentation /></RequirePermission>} />
                </Route>

                {/* Vendor routes */}
                <Route path="/vendor" element={<VendorLayout />}>
                  <Route path="dashboard" element={<VendorDashboard />} />
                  <Route path="products" element={<VendorProducts />} />
                  <Route path="products/new" element={<AddProductPage />} />
                  <Route path="products/edit/:id" element={<EditProductPage />} />
                  <Route path="orders" element={<VendorOrders />} />
                  <Route path="earnings" element={<VendorEarnings />} />
                  <Route path="notifications" element={<VendorNotifications />} />
                  <Route path="messages" element={<VendorMessages />} />
                  <Route path="settings" element={<VendorSettings />} />
                  <Route path="bulk-import" element={<VendorBulkImport />} />
                  <Route path="media" element={<VendorMedia />} />
                  <Route path="resources" element={<VendorResources />} />
                  <Route path="resources/c/:slug" element={<VendorResourceCategory />} />
                  <Route path="resources/r/:slug" element={<VendorResourceDetail />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
              <CookieConsent />
            </CartProvider>
          </AuthProvider>
        </TranslationProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
