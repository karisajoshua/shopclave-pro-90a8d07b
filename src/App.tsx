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
import AdminMedia from "./pages/admin/AdminMedia";
import VendorMedia from "./pages/vendor/VendorMedia";
import ShortLinkRedirect from "./pages/ShortLinkRedirect";

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
                <Route path="/product/:slug" element={<ProductDetailPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/category/:slug" element={<SearchPage />} />
                <Route path="/vendor/register" element={<VendorRegisterPage />} />
                <Route path="/store/:slug" element={<VendorStorePage />} />
                <Route path="/s/:code" element={<ShortLinkRedirect />} />

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
                  <Route index element={<AdminDashboard />} />
                  <Route path="vendors" element={<AdminVendors />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="categories" element={<AdminCategories />} />
                  <Route path="bulk-import" element={<AdminBulkImport />} />
                  <Route path="media" element={<AdminMedia />} />
                  <Route path="withdrawals" element={<AdminWithdrawals />} />
                  <Route path="analytics" element={<AdminAnalyticsPage />} />
                  <Route path="subscriptions" element={<AdminSubscriptions />} />
                  <Route path="notifications" element={<AdminNotifications />} />
                  <Route path="messages" element={<AdminMessages />} />
                  <Route path="settings" element={<AdminSettings />} />
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
