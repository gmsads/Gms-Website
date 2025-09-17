// src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import ServiceUpdate from './Admin/ServiceUpdate';
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/order" element={<Order />} />

        <Route
          path="/vieworders"
          element={
            <ProtectedRoute>
              <ViewOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/it-dashboard"
          element={
            <ProtectedRoute>
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
          <Route path="/it-dashboard/logout-history" element={<LogoutHistory />} />
        </Route>
        <Route path="prospects" element={<Prospective />} />

        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        >

          <Route path="appointments" element={<Appointment />} />
          <Route path="prospects" element={<Prospective />} />
          <Route path="daily-report" element={<DailyReport />} />
          <Route path="view-orders" element={<ViewOrders />} />
          <Route path="employees" element={<Employees />} />
          <Route path="add-executive" element={<AddExecutiveAdmin />} />
          <Route path="activity" element={<ActivityChart />} />
          <Route path="pending-payment" element={<PendingPayment />} />
          <Route path="pending-service" element={<PendingService />} />
          <Route path="appointments" element={<Appointment />} />
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
          <Route path="service-update" element={<ServiceUpdate />} />
          <Route path="price-list" element={<Pricelist />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="hour-reeport" element={<HourReport />} />
           <Route path="design-report" element={<DesignReport/>} />
          
        </Route>
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

        <Route
          path="/sales-manager-dashboard"
          element={
            <ProtectedRoute>
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
            <ProtectedRoute>
              <ExecutiveDashboard />
            </ProtectedRoute>
          }
        />
        
        {/* Field Executive Page Route - ADDED THIS SECTION */}
        <Route
          path="/field-executive"
          element={
            <ProtectedRoute allowedRoles={['fieldexecutive']}>
              <FieldExecutivePage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/followup"
          element={
            <ProtectedRoute>
              <Followup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pending-payment"
          element={
            <ProtectedRoute>
              <PendingPayment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pending-service"
          element={
            <ProtectedRoute>
              <PendingService />
            </ProtectedRoute>
          }
        />
        <Route
          path="/new-appointment"
          element={
            <ProtectedRoute>
              <NewAppointment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/service-dashboard"
          element={
            <ProtectedRoute>
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
        </Route>
        <Route
          path="/designer-dashboard"
          element={
            <ProtectedRoute>
              <DesignerDashboard />
            </ProtectedRoute>
          }
        >
          <Route path="assigned-designs" element={<AssignedDesigns />} />
           <Route path="start-design" element={<StartDesign />} />
        </Route>
        <Route
          path="/digital-dashboard"
          element={
            <ProtectedRoute>
              <DigitalMarketingDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account-dashboard"
          element={
            <ProtectedRoute>
              <AccountDashboard />
            </ProtectedRoute>
          }
        >
          <Route path="pending-payment" element={<PendingPayment />} />
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
        </Route>
      </Routes>

    </BrowserRouter>
  );
}

export default App;