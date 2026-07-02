// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import LandingPage from './mainpage/LandingPage';
import Order from './Executive/order';
import ViewOrders from './Admin/ViewOrders';
import AdminDashboard from './Admin/AdminDashboard';
import AddExecutiveAdmin from './Admin/AddExecutiveAdmin';
import ActivityChart from './Admin/ActivityChart';
import PendingPayment from './Admin/PendingPayment';
import PendingService from './Admin/PendingService';
import SelectAppointment from './Admin/SelectAppointment';
import Appointment from './Executive/Appointment';
import ExecutiveDashboard from './Executive/ExecutiveDashboard';
import NewAppointment from './Executive/NewAppointment';
import DesignerDashboard from './Designer/DesignerDashboard';
import AccountDashboard from './Accounts/AccountDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import AppoitmentStatus from './Admin/AppointmentStatus';
import CreateOrder from './Admin/CreatOrder';
import Ledger from './Admin/Ledger';
import Employees from './Admin/Employees';
import AssignService from './Accounts/AssignService';
import Viewprospective from './Admin/Viewprospective';
import ServiceDashboard from './Service/ServiceDashboard';
import ViewAppointments from './Executive/ViewAppointments';
import Prospective from './Executive/Prospective';
import DailyReport from './Admin/DailyRecord';
import ViewDesign from './Admin/ViewDesign';
import ViewServices from './Service/ViewServices';
import DigitalMarketingDashboard from './DigitalMarketing/DigitalMarketingDashboard';
import AssignedDesigns from './Designer/AssignedDesigns';
import Followup from './Executive/Followup';
import ExecutivesLogins from './Admin/ExecutivesLogins';
import CreateAnniversary from './Admin/CreateAnniversary';
import AnniversaryList from './Admin/AnniversaryList';
import SalesManagerDashboard from './sales-manager/SalesManager';
import VendorDashboard from './Vendor/VendorDashboard';
import VendorPayment from './Vendor/VendorPayment';
import VendorViewOrders from './Vendor/VendorViewOrders';
import ViewPerformance from './Admin/ViewPerformance';
import ServiceManagerDashboard from './ServiceManager/Servicemanagerdashbaord';
import ITDashboard from './ITTeam/ITDashboard';
import DesignUpdates from "./Service/DesignUpdates";
import Vendors from './Service/Vendors';
import Pricelist from './Service/Pricelist';
import Inventory from './Admin/Inventory ';
import LogoutHistory from './ITTeam/LogoutHistory';
import Hourrecord from './ITTeam/Hourrecord';
import HourReport from './ITTeam/HourReport';
import DailySchedule from './ITTeam/DailySchedule';
import Expenses from './Service/Expenses';
import ViewExpenses from './Admin/ViewExpenses';
import Record from './Executive/Record';
import StartDesign from './Designer/StartDesign';
import DesignReport from './Admin/DesignReports';
import FieldExecutivePage from './Executive/FieldExecutivePage';
import UnitDashboard from './unit/UnitDashboard.jsx';
import EmployeeFaceEnroll from './unit/EmployeeFaceEnroll.jsx';
import EmployeeLogin from './unit/EmployeeLogin.jsx';
import UnitAttendance from './Admin/UnitAttendance.jsx';
import TrashOrders from './Admin/TrashOrders';
import AgentDashboard from './Agent/AgentDashboard.jsx'
import Parties from './Admin/Parties';
import Quotation from './Admin/Quotation';
import InstallPWAButton from './components/InstallPWAButton';
import FieldVisitsAdmin from './Admin/FieldVisitsAdmin';
import AdvanceApprovalPage from './Admin/AdvanceApprovalPage';
import ServiceForm from './Service/ServiceForm.jsx';
import Purchase from './Admin/Purchase';
import TeleBreaks from './Admin/TeleBreaks.jsx';
import AdminLeadDistribution from './Admin/AdminLeadDistribution.jsx';
import HRDashboard from './HR/HRDashboards.jsx';
import GreetingdesignForm from './Designer/GreetingDesignForm.jsx'
import GreetingDesign from './Admin/GreetingDesign.jsx';
// Import HR specific components
import SalaryComponent from './Admin/SalaryComponent.jsx';
import AttendanceComponent from './Admin/AttendanceComponent.jsx';
import ViewLeave from './Admin/AdminAllLeaves.jsx';
import DailyHrDashbaord from './HR/DailyHRReport.jsx';
import ViewHRReports from './Admin/ViewHRReports.jsx';
// Import Video Editor Dashboard and its sub-components
import VideoEditorDashboard from './VideoEditors/VideoEditorDashboard.jsx';
import AssignedVideos from './VideoEditors/AssignedVideos.jsx';
import UploadVideo from './VideoEditors/UploadVideo.jsx';
import MyWork from './VideoEditors/MyWork.jsx';
import BannerManagement from './Admin/BannerManagement';
// ============ WRAPPER COMPONENT FOR HR ATTENDANCE ============
const AttendanceWithEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await axios.get('/api/employees');
        const employeesData = response.data;

        let allEmployees = [];
        Object.keys(employeesData).forEach(role => {
          const roleEmployees = employeesData[role].map(emp => ({
            ...emp,
            role: role,
            active: emp.active !== false
          }));
          allEmployees = [...allEmployees, ...roleEmployees];
        });

        setEmployees(allEmployees);
      } catch (error) {
        console.error('Error fetching employees:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  if (loading) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        fontSize: '18px',
        color: '#666'
      }}>
        Loading employees...
      </div>
    );
  }

  return <AttendanceComponent employees={employees} />;
};
// ============================================================

function App() {
  return (
    <BrowserRouter>
      {/* PWA Install Button visible on all pages */}
      <InstallPWAButton />
      <Routes>

        {/* ============ VIDEO EDITOR DASHBOARD ROUTE WITH NESTED ROUTES ============ */}
        <Route
          path="/video-editor-dashboard"
          element={
            <ProtectedRoute allowedRoles={['Video Editor', 'Admin']}>
              <VideoEditorDashboard loggedInUser={localStorage.getItem('userName')} />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<VideoEditorDashboard loggedInUser={localStorage.getItem('userName')} />} />
          <Route path="assigned-videos" element={<AssignedVideos />} />
          <Route path="upload-video" element={<UploadVideo />} />
          <Route path="my-work" element={<MyWork />} />
        </Route>
        {/* ====================================================== */}

        {/* ============ HR DASHBOARD ROUTE WITH NESTED ROUTES ============ */}
        <Route
          path="/hr-dashboard"
          element={
            <ProtectedRoute allowedRoles={['HR', 'Admin']}>
              <HRDashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<HRDashboard />} />

          {/* Using existing Admin components for HR */}
          <Route path="hour" element={<Hourrecord />} />
          <Route path="hour-reeport" element={<HourReport />} />
          <Route path="fieldvisitsadmin" element={<FieldVisitsAdmin />} />
          <Route path="daily-report" element={<DailyReport />} />
          <Route path="employees" element={<Employees />} />
          <Route path="hr-report" element={<DailyHrDashbaord />} />
          <Route path="add-employee" element={<AddExecutiveAdmin />} />
          <Route path="view-performance" element={<ViewPerformance />} />
          <Route path="view-leaves" element={<ViewLeave />} />
          <Route path="advance-approvals" element={<AdvanceApprovalPage />} />
          {/* HR specific components - NOW WITH EMPLOYEES PROP */}
          <Route path="salary" element={<SalaryComponent />} />
          <Route path="attendance" element={<AttendanceWithEmployees />} />
          <Route path="leave-requests" element={<AttendanceWithEmployees />} />
          <Route path="reports" element={<ViewPerformance />} />
          <Route path="settings" element={<div>HR Settings - Coming Soon</div>} />
        </Route>
        {/* ============================================================== */}

        {/* Unit Dashboard Routes */}
        <Route
          path="/unit-dashboard"
          element={
            <ProtectedRoute>
              <UnitDashboard />
            </ProtectedRoute>
          }
        >
          <Route path="daily-report" element={<DailyReport />} />
          <Route path="record" element={<Record />} />
          <Route path="hour" element={<Hourrecord />} />
          <Route path="hour-reeport" element={<HourReport />} />
          <Route path="employee-face" element={<EmployeeFaceEnroll />} />
          <Route path="employee-login" element={<EmployeeLogin />} />
        </Route>

        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/order" element={<Order />} />

        {/* View Orders Route */}
        <Route
          path="/vieworders"
          element={
            <ProtectedRoute>
              <ViewOrders />
            </ProtectedRoute>
          }
        />

        {/* IT Dashboard Routes */}
        <Route
          path="/it-dashboard"
          element={
            <ProtectedRoute allowedRoles={['IT', 'Admin']}>
              <ITDashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<ITDashboard />} />
          <Route path="create-order" element={<CreateOrder />} />
          <Route path="view-orders" element={<ViewOrders />} />
          <Route path="create-prospect" element={<Prospective />} />
          <Route path="view-prospects" element={<Viewprospective />} />
          <Route path="appointments" element={<Appointment />} />
          <Route path="view-appointments" element={<ViewAppointments />} />
          <Route path="price-list" element={<Pricelist />} />
          <Route path="followup" element={<Followup />} />
          <Route path="hour" element={<Hourrecord />} />
          <Route path="hour-reeport" element={<HourReport />} />
          <Route path="schedule" element={<DailySchedule />} />
          <Route path="logout-history" element={<LogoutHistory />} />
        </Route>

        {/* Prospects Route */}
        <Route path="/prospects" element={<Prospective />} />

        {/* Admin Dashboard Routes */}
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        >
          <Route path="purchase" element={<Purchase />} />
          <Route path="hour-reeport" element={<HourReport />} />
          <Route path="view-hrreport" element={<ViewHRReports />} />
          <Route path="view-leaves" element={<ViewLeave />} />
          <Route path="greeting-design" element={<GreetingDesign />} />
          <Route path="tele-breaks" element={<TeleBreaks />} />
          <Route path="lead-distribution" element={<AdminLeadDistribution />} />
          <Route path="appointments" element={<Appointment />} />
          <Route path="prospects" element={<Prospective />} />
          <Route path="vendors" element={<Vendors />} />
          <Route path="daily-report" element={<DailyReport />} />
          <Route path="trash-orders" element={<TrashOrders />} />
          <Route path="unit-attendance" element={<UnitAttendance />} />
          <Route path="view-orders" element={<ViewOrders />} />
          <Route path="employees" element={<Employees />} />
          <Route path="add-executive" element={<AddExecutiveAdmin />} />
          <Route path="activity" element={<ActivityChart />} />
          <Route path="pending-payment" element={<PendingPayment />} />
          <Route path="pending-service" element={<PendingService />} />
          <Route path="select-appointment" element={<SelectAppointment />} />
          <Route path="appointment-status" element={<AppoitmentStatus />} />
          <Route path="ledger" element={<Ledger />} />
          <Route path="view-expenses" element={<ViewExpenses />} />
          <Route path="view-design" element={<ViewDesign />} />
          <Route path="create-order" element={<CreateOrder />} />
          <Route path="assign-service" element={<AssignService />} />
          <Route path="view-prospective" element={<Viewprospective />} />
          <Route path="executives-logins" element={<ExecutivesLogins />} />
          <Route path="create-anniversary" element={<CreateAnniversary />} />
          <Route path="anniversary-list" element={<AnniversaryList />} />
          <Route path="performance" element={<ViewPerformance />} />
          <Route path="price-list" element={<Pricelist />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="hour-reeport" element={<HourReport />} />
          <Route path="design-report" element={<DesignReport />} />
          <Route path="parties" element={<Parties />} />
          <Route path="quotation" element={<Quotation />} />
          <Route path="advance-approvals" element={<AdvanceApprovalPage />} />
          <Route path="fieldvisitsadmin" element={<FieldVisitsAdmin />} />
          <Route path="create-banner" element={<BannerManagement />} />
        </Route>

        {/* Agent Dashboard Routes */}
        <Route
          path="/agent-dashboard"
          element={
            <ProtectedRoute allowedRoles={['Agent']}>
              <AgentDashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<AgentDashboard />} />
          <Route path="create-order" element={<CreateOrder />} />
          <Route path="view-orders" element={<ViewOrders />} />
          <Route path="quotation" element={<Quotation />} />
          <Route path="create-prospect" element={<Prospective />} />
          <Route path="price-list" element={<Pricelist />} />

          <Route path="view-prospects" element={<Viewprospective />} />        </Route>

        {/* Field Executive Route */}
        <Route
          path="/field-executive"
          element={
            <ProtectedRoute allowedRoles={['Agent', 'FieldExecutive']}>
              <FieldExecutivePage />
            </ProtectedRoute>
          }
        />

        {/* Service Manager Dashboard Routes */}
        <Route
          path="/service-manager-dashboard"
          element={
            <ProtectedRoute allowedRoles={['Service Manager']}>
              <ServiceManagerDashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<ServiceManagerDashboard />} />
          <Route path="pending-services" element={<PendingService />} />
          <Route path="create-order" element={<CreateOrder />} />
          <Route path="view-orders" element={<ViewOrders />} />
          <Route path="appointments" element={<Appointment />} />
          <Route path="ledger" element={<Ledger />} />
          <Route path="view-appointments" element={<ViewAppointments />} />
          <Route path="prospects" element={<Prospective />} />
          <Route path="view-prospective" element={<Viewprospective />} />
          <Route path="assign-service" element={<AssignService />} />
          <Route path="price-list" element={<Pricelist />} />
        </Route>

        {/* Vendor Dashboard Routes */}
        <Route
          path="/vendor-dashboard"
          element={
            <ProtectedRoute allowedRoles={['Vendor']}>
              <VendorDashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<VendorDashboard />} />
          <Route path="view-orders" element={<VendorViewOrders />} />
          <Route path="payment" element={<VendorPayment />} />
        </Route>

        {/* Sales Manager Dashboard Routes */}
        <Route
          path="/sales-manager-dashboard"
          element={
            <ProtectedRoute allowedRoles={['Sales Manager', 'Admin']}>
              <SalesManagerDashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<SalesManagerDashboard />} />
          <Route path="executives" element={<Employees />} />
          <Route path="view-design" element={<ViewDesign />} />
          <Route path="add-executive" element={<AddExecutiveAdmin />} />
          <Route path="employees" element={<Employees />} />
          <Route path="daily-report" element={<DailyReport />} />
          <Route path="executives-logins" element={<ExecutivesLogins />} />
          <Route path="view-orders" element={<ViewOrders />} />
          <Route path="create-order" element={<CreateOrder />} />
          <Route path="assign-target" element={<ActivityChart />} />
          <Route path="pending-payment" element={<PendingPayment />} />
          <Route path="assign-service" element={<AssignService />} />
          <Route path="pending-service" element={<PendingService />} />
          <Route path="prospects" element={<Prospective />} />
          <Route path="appointments" element={<Appointment />} />
          <Route path="select-appointment" element={<SelectAppointment />} />
          <Route path="activity" element={<ActivityChart />} />
          <Route path="ledger" element={<Ledger />} />
          <Route path="view-prospective" element={<Viewprospective />} />
          <Route path="create-anniversary" element={<CreateAnniversary />} />
          <Route path="anniversary-list" element={<AnniversaryList />} />
          <Route path="price-list" element={<Pricelist />} />
        </Route>

        {/* Executive Dashboard Route */}
        <Route
          path="/executive-dashboard"
          element={
            <ProtectedRoute allowedRoles={['Executive', 'FieldExecutive', 'Agent']}>
              <ExecutiveDashboard />
            </ProtectedRoute>
          }
        />

        {/* Performance Route */}
        <Route path="/performance" element={<ViewPerformance />} />

        {/* Followup Route */}
        <Route
          path="/followup"
          element={
            <ProtectedRoute allowedRoles={['Executive', 'Agent', 'Admin']}>
              <Followup />
            </ProtectedRoute>
          }
        />

        {/* Pending Payment Route */}
        <Route
          path="/pending-payment"
          element={
            <ProtectedRoute allowedRoles={['Executive', 'Account', 'Admin']}>
              <PendingPayment />
            </ProtectedRoute>
          }
        />

        {/* Pending Service Route */}
        <Route
          path="/pending-service"
          element={
            <ProtectedRoute allowedRoles={['Executive', 'Service Executive', 'Admin']}>
              <PendingService />
            </ProtectedRoute>
          }
        />

        {/* New Appointment Route */}
        <Route
          path="/new-appointment"
          element={
            <ProtectedRoute allowedRoles={['Executive', 'Agent']}>
              <NewAppointment />
            </ProtectedRoute>
          }
        />

        {/* Service Dashboard Routes */}
        <Route
          path="/service-dashboard"
          element={
            <ProtectedRoute allowedRoles={['Service Executive', 'Service Manager', 'Admin']}>
              <ServiceDashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<ServiceDashboard />} />
          <Route path="pending-services" element={<PendingService />} />
          <Route path="create-order" element={<CreateOrder />} />
          <Route path="view-orders" element={<ViewOrders />} />
          <Route path="appointments" element={<Appointment />} />
          <Route path="ledger" element={<Ledger />} />
          <Route path="view-appointments" element={<ViewAppointments />} />
          <Route path="prospects" element={<Prospective />} />
          <Route path="view-prospective" element={<Viewprospective />} />
          <Route path="view-services" element={<ViewServices />} />
          <Route path="design-updates" element={<DesignUpdates />} />
          <Route path="vendors" element={<Vendors />} />
          <Route path="price-list" element={<Pricelist />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="view-expenses" element={<ViewExpenses />} />
          <Route path="hour" element={<Hourrecord />} />
          <Route path="hour-reeport" element={<HourReport />} />
          <Route path="daily-report" element={<DailyReport />} />
          <Route path="daily-record" element={<Record />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="serviceform" element={<ServiceForm />} />
          <Route path="field-executive" element={<FieldExecutivePage />} />
        </Route>

        {/* Designer Dashboard Routes */}
        <Route
          path="/designer-dashboard"
          element={
            <ProtectedRoute allowedRoles={['Designer', 'Admin']}>
              <DesignerDashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DesignerDashboard />} />
          <Route path="assigned-designs" element={<AssignedDesigns />} />
          <Route path="greetingdesignform" element={<GreetingdesignForm />} />
          <Route path="start-design" element={<StartDesign />} />
          <Route path="hour" element={<Hourrecord />} />
        </Route>

        {/* Digital Marketing Dashboard Route */}
        <Route
          path="/digital-dashboard"
          element={
            <ProtectedRoute allowedRoles={['Digital Marketing', 'Admin']}>
              <DigitalMarketingDashboard />
            </ProtectedRoute>
          }
        />

        {/* Account Dashboard Routes */}
        <Route
          path="/account-dashboard"
          element={
            <ProtectedRoute allowedRoles={['Account', 'Admin']}>
              <AccountDashboard />
            </ProtectedRoute>
          }
        >
          <Route path="pending-payment" element={<PendingPayment />} />
          <Route path="vendors" element={<Vendors />} />
          <Route path="pending-service" element={<PendingService />} />
          <Route path="create-order" element={<CreateOrder />} />
          <Route path="view-orders" element={<ViewOrders />} />
          <Route path="activity" element={<ActivityChart />} />
          <Route path="assign-service" element={<AssignService />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="view-expenses" element={<ViewExpenses />} />
          <Route path="hour" element={<Hourrecord />} />
          <Route path="hour-reeport" element={<HourReport />} />
          <Route path="daily-record" element={<Record />} />
          <Route path="daily-report" element={<DailyReport />} />
          <Route path="inventory" element={<Inventory />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;