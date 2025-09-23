import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, FlatList, BackHandler, Modal, Animated, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { db, formatCurrency } from '../lib/instant';
import { useStore } from '../lib/store-context';
import Card from './ui/Card';
import TopBar from './ui/TopBar';

interface Order {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName?: string;
  status: string;
  fulfillmentStatus: string;
  paymentStatus: string;
  total: number;
  createdAt: Date; // Use consistent field naming
  orderitems?: Array<{
    id: string;
    title: string;
    quantity: number; // Use consistent field naming
    price: number;
  }>;
  customer?: Array<{
    id: string;
    name: string;
    email?: string;
  }>;
  location?: Array<{
    id: string;
    name: string;
  }>;
}

interface OrdersScreenProps {
  onCreateOrder: () => void;
  onOrderSelect: (order: Order) => void;
  onClose: () => void;
}

const ORDER_FILTERS = [
  { id: 'all', label: 'All Orders' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' }
];

export default function OrdersScreen({ onCreateOrder, onOrderSelect, onClose }: OrdersScreenProps) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('active');
  const [showLocationFilter, setShowLocationFilter] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showStatusDrawer, setShowStatusDrawer] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [detailsOrder, setDetailsOrder] = useState<Order | null>(null);
  const [drawerAnimation] = useState(new Animated.Value(0));

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });

    return () => backHandler.remove();
  }, [onClose]);

  // Query orders from InstantDB with optimized schema
  const { data, isLoading, error } = db.useQuery({
    orders: {
      orderitems: {},
      customer: {},
      location: {}, // Use new location relationship
      $: {
        where: {}, // No store filtering needed since schema doesn't include storeId
        order: {
          createdAt: 'desc' // Use consistent field naming
        }
      }
    }
  });

  const orders = data?.orders || [];

  // Filter orders based on search and status
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Debug: Log order statuses to console
    if (orders.length > 0) {
      console.log('Sample order statuses:', orders.slice(0, 3).map(order => ({
        orderNumber: order.orderNumber,
        status: order.status,
        fulfillmentStatus: order.fulfillmentStatus,
        paymentStatus: order.paymentStatus
      })));
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((order: Order) =>
        (order.orderNumber || '').toLowerCase().includes(query) ||
        (order.customerName || '').toLowerCase().includes(query) ||
        ((order.customer && order.customer[0] && order.customer[0].name) ? order.customer[0].name.toLowerCase() : '').includes(query) ||
        ((order.customer && order.customer[0] && order.customer[0].email) ? order.customer[0].email.toLowerCase() : '').includes(query)
      );
    }

    // Apply simple status filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter((order: Order) => {
        switch (activeFilter) {
          case 'active':
            // Show orders that are still being processed (not fully complete)
            return order.status !== 'closed';
          case 'completed':
            // Show orders that are fully complete
            return order.status === 'closed';
          default:
            return true;
        }
      });
    }

    console.log(`Filter: ${activeFilter}, Total orders: ${orders.length}, Filtered: ${filtered.length}`);
    return filtered;
  }, [orders, searchQuery, activeFilter]);

  const getStatusColor = (status: string, type: 'fulfillment' | 'payment') => {
    if (type === 'fulfillment') {
      switch (status) {
        case 'fulfilled': return 'bg-green-100 text-green-800';
        case 'partial': return 'bg-yellow-100 text-yellow-800';
        case 'unfulfilled': return 'bg-gray-100 text-gray-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    } else {
      switch (status) {
        case 'paid': return 'bg-green-100 text-green-800';
        case 'partial': return 'bg-yellow-100 text-yellow-800';
        case 'unpaid': return 'bg-red-100 text-red-800';
        case 'refunded': return 'bg-gray-100 text-gray-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const orderDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - orderDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    
    return orderDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: orderDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  // Order details functions
  const showOrderDetailsScreen = (order: Order) => {
    setDetailsOrder(order);
    setShowOrderDetails(true);
  };

  const closeOrderDetails = () => {
    setShowOrderDetails(false);
    setDetailsOrder(null);
  };

  // Status update functions
  const openStatusDrawer = (order: Order) => {
    setSelectedOrder(order);
    setShowStatusDrawer(true);
    Animated.timing(drawerAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const closeStatusDrawer = () => {
    Animated.timing(drawerAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      setShowStatusDrawer(false);
      setSelectedOrder(null);
    });
  };

  const updateOrderStatus = async (statusType: 'fulfillmentStatus' | 'paymentStatus', newStatus: string) => {
    if (!selectedOrder) return;

    try {
      // Calculate automatic order status based on fulfillment and payment
      let orderStatus = selectedOrder.status;
      let updatedFulfillment = selectedOrder.fulfillmentStatus;
      let updatedPayment = selectedOrder.paymentStatus;

      // Update the specific status
      if (statusType === 'fulfillmentStatus') {
        updatedFulfillment = newStatus;
      } else if (statusType === 'paymentStatus') {
        updatedPayment = newStatus;
      }

      // Auto-determine order status
      if (updatedFulfillment === 'fulfilled' && updatedPayment === 'paid') {
        orderStatus = 'closed'; // Order is complete
      } else {
        orderStatus = 'open'; // Order still needs work
      }

      // Update database with all changes
      await db.transact([
        db.tx.orders[selectedOrder.id].update({
          [statusType]: newStatus,
          status: orderStatus
        })
      ]);
      
      // Update both selected order and details order states immediately
      const updatedOrder = { 
        ...selectedOrder, 
        [statusType]: newStatus,
        status: orderStatus
      };
      setSelectedOrder(updatedOrder);
      
      // Also update details order if it's the same order
      if (detailsOrder && detailsOrder.id === selectedOrder.id) {
        setDetailsOrder(updatedOrder);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const renderOrderItem = ({ item: order }: { item: Order }) => {
    const itemCount = order.orderitems?.length || 0;
    const customerName = order.customerName || order.customer?.[0]?.name || 'Guest';

    return (
      <View className="px-4 py-4 bg-white">
        <TouchableOpacity
          onPress={() => showOrderDetailsScreen(order)}
          className="flex-row items-center"
        >
          {/* Order Icon */}
          <View className="w-12 h-12 bg-gray-200 mr-3 items-center justify-center rounded-lg">
            <Feather name="shopping-bag" size={20} color="#6B7280" />
          </View>

          {/* Order Details */}
          <View className="flex-1">
            <Text className="text-base font-medium text-gray-900 mb-1">
              {order.orderNumber}
            </Text>
            <Text className="text-sm text-gray-500 mb-2">
              {customerName} • {itemCount} item{itemCount !== 1 ? 's' : ''} • {formatDate(order.createdAt)}
            </Text>
            
            {/* Status Tags */}
            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={() => openStatusDrawer(order)}
                className={`px-2 py-1 rounded-md mr-2 ${getStatusColor(order.fulfillmentStatus, 'fulfillment')}`}
              >
                <Text className="text-xs font-medium capitalize">
                  {order.fulfillmentStatus}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => openStatusDrawer(order)}
                className={`px-2 py-1 rounded-md mr-2 ${getStatusColor(order.paymentStatus, 'payment')}`}
              >
                <Text className="text-xs font-medium capitalize">
                  {order.paymentStatus}
                </Text>
              </TouchableOpacity>
              {order.status === 'open' && (
                <TouchableOpacity
                  onPress={() => openStatusDrawer(order)}
                  className="px-2 py-1 rounded-md bg-blue-100"
                >
                  <Text className="text-xs font-medium text-blue-800">Open</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Price */}
          <View className="items-end">
            <Text className="text-base font-semibold text-gray-900">
              {formatCurrency(order.total)}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Search Bar - Following products screen pattern */}
      <View className="bg-white px-4 py-3">
        <View className="flex-row items-center">
          {/* Back Icon */}
          <TouchableOpacity onPress={onClose}>
            <Feather name="arrow-left" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Search Input */}
          <TextInput
            placeholder="Search orders..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 text-base text-gray-900 ml-3 mr-3"
            placeholderTextColor="#9CA3AF"
          />

          {/* Add Order Icon */}
          <TouchableOpacity onPress={onCreateOrder}>
            <Feather name="plus" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs - Following products screen pattern */}
      <View className="px-4 py-3 bg-white border-b border-gray-100">
        <View className="flex-row">
          {ORDER_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.id}
              onPress={() => setActiveFilter(filter.id)}
              className={`mr-6 pb-2 ${
                activeFilter === filter.id ? 'border-b-2 border-blue-600' : ''
              }`}
            >
              <Text className={`text-base font-medium ${
                activeFilter === filter.id ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Orders List */}
      <View className="flex-1">
        {isLoading ? (
          <View className="flex-1 justify-center items-center">
            <Text className="text-gray-500 text-lg">Loading orders...</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View className="flex-1 justify-center items-center px-6">
            <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-6">
              <Feather name="shopping-bag" size={40} color="#9CA3AF" />
            </View>
            <Text className="text-2xl font-bold text-gray-900 mb-3">No orders found</Text>
            <Text className="text-gray-500 text-center mb-8 text-lg">
              {searchQuery ? 'Try adjusting your search or filters' : 'Create your first order to get started'}
            </Text>
            <TouchableOpacity
              onPress={onCreateOrder}
              className="bg-blue-600 px-8 py-4 rounded-2xl"
              style={{ minHeight: 56 }}
            >
              <Text className="text-white font-bold text-lg">Create Order</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredOrders}
            renderItem={renderOrderItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
          />
        )}
      </View>

      {/* Order Details Screen */}
      <Modal
        visible={showOrderDetails}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeOrderDetails}
      >
        <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
          {/* Header */}
          <View className="bg-white px-4 py-3 border-b border-gray-100">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity onPress={closeOrderDetails}>
                <Feather name="arrow-left" size={24} color="#374151" />
              </TouchableOpacity>
              <Text className="text-lg font-semibold text-gray-900">Order Details</Text>
              <TouchableOpacity onPress={() => detailsOrder && openStatusDrawer(detailsOrder)}>
                <Feather name="edit-3" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {detailsOrder && (
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              {/* Order Header */}
              <View className="px-4 py-6 bg-white">
                <Text className="text-2xl font-bold text-gray-900 mb-2">
                  {detailsOrder.orderNumber}
                </Text>
                <Text className="text-gray-500 text-base mb-4">
                  {formatDate(detailsOrder.createdAt)} • {detailsOrder.location?.[0]?.name || 'Main Location'}
                </Text>
                
                {/* Status Row */}
                <View className="flex-row items-center mb-4">
                  <View className={`px-3 py-1 rounded-full mr-3 ${getStatusColor(detailsOrder.fulfillmentStatus, 'fulfillment')}`}>
                    <Text className="text-sm font-medium capitalize">
                      {detailsOrder.fulfillmentStatus}
                    </Text>
                  </View>
                  <View className={`px-3 py-1 rounded-full mr-3 ${getStatusColor(detailsOrder.paymentStatus, 'payment')}`}>
                    <Text className="text-sm font-medium capitalize">
                      {detailsOrder.paymentStatus}
                    </Text>
                  </View>
                  {detailsOrder.status === 'open' && (
                    <View className="px-3 py-1 rounded-full bg-blue-100">
                      <Text className="text-sm font-medium text-blue-800">Open</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Customer Info */}
              <View className="px-4 py-4 bg-gray-50 border-y border-gray-100">
                <Text className="text-lg font-semibold text-gray-900 mb-3">Customer</Text>
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-gray-300 rounded-full items-center justify-center mr-3">
                    <Feather name="user" size={20} color="#6B7280" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-medium text-gray-900">
                      {detailsOrder.customerName || detailsOrder.customer?.[0]?.name || 'Guest Customer'}
                    </Text>
                    {detailsOrder.customer?.[0]?.email && (
                      <Text className="text-sm text-gray-500">
                        {detailsOrder.customer[0].email}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Order Items */}
              <View className="px-4 py-4 bg-white">
                <Text className="text-lg font-semibold text-gray-900 mb-4">Items</Text>
                {detailsOrder.orderitems && detailsOrder.orderitems.length > 0 ? (
                  detailsOrder.orderitems.map((item, index) => (
                    <View key={item.id} className="flex-row items-center py-3 border-b border-gray-100 last:border-b-0">
                      <View className="w-12 h-12 bg-gray-200 rounded-lg items-center justify-center mr-3">
                        <Feather name="package" size={20} color="#6B7280" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-medium text-gray-900 mb-1">
                          {item.title}
                        </Text>
                        <Text className="text-sm text-gray-500">
                          Qty: {item.quantity} × {formatCurrency(item.price)}
                        </Text>
                      </View>
                      <Text className="text-base font-semibold text-gray-900">
                        {formatCurrency(item.quantity * item.price)}
                      </Text>
                    </View>
                  ))
                ) : (
                  <View className="py-8 items-center">
                    <Text className="text-gray-500">No items in this order</Text>
                  </View>
                )}
              </View>

              {/* Order Summary */}
              <View className="px-4 py-4 bg-gray-50 border-t border-gray-100">
                <Text className="text-lg font-semibold text-gray-900 mb-4">Summary</Text>
                
                <View className="space-y-2">
                  <View className="flex-row justify-between items-center py-2">
                    <Text className="text-base text-gray-600">Subtotal</Text>
                    <Text className="text-base text-gray-900">
                      {formatCurrency(detailsOrder.total)}
                    </Text>
                  </View>
                  
                  <View className="flex-row justify-between items-center py-2 border-t border-gray-200">
                    <Text className="text-lg font-semibold text-gray-900">Total</Text>
                    <Text className="text-lg font-bold text-gray-900">
                      {formatCurrency(detailsOrder.total)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Actions */}
              <View className="px-4 py-6 bg-white">
                <TouchableOpacity
                  onPress={() => openStatusDrawer(detailsOrder)}
                  className="bg-blue-600 py-4 rounded-xl items-center"
                >
                  <Text className="text-white font-semibold text-base">Update Status</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Status Update Bottom Drawer */}
      <Modal
        visible={showStatusDrawer}
        transparent={true}
        animationType="none"
        onRequestClose={closeStatusDrawer}
      >
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={closeStatusDrawer}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <Animated.View
                style={{
                  transform: [{
                    translateY: drawerAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [400, 0],
                    })
                  }]
                }}
                className="bg-white rounded-t-3xl px-6 py-6"
                style={{ paddingBottom: insets.bottom + 24 }}
              >
                {/* Drawer Handle */}
                <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-6" />

                {/* Header */}
                <View className="flex-row items-center justify-between mb-6">
                  <Text className="text-xl font-bold text-gray-900">
                    Update Status
                  </Text>
                  <TouchableOpacity onPress={closeStatusDrawer}>
                    <Feather name="x" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                {selectedOrder && (
                  <View>
                    {/* Order Info */}
                    <View className="mb-8">
                      <Text className="text-xl font-bold text-gray-900 mb-2">
                        {selectedOrder.orderNumber}
                      </Text>
                      <Text className="text-gray-500 text-base mb-4">
                        {selectedOrder.customerName || selectedOrder.customer?.[0]?.name || 'Guest'} • {formatCurrency(selectedOrder.total)}
                      </Text>
                      
                      {/* Auto Status Info */}
                      <View className="bg-blue-50 p-3 rounded-lg">
                        <Text className="text-sm text-blue-800">
                          Order will automatically close when both fulfilled and paid
                        </Text>
                      </View>
                    </View>

                    {/* Simple Status Actions */}
                    <View className="mb-6">
                      {/* Mark as Fulfilled/Unfulfilled */}
                      <TouchableOpacity
                        onPress={() => updateOrderStatus('fulfillmentStatus', 
                          selectedOrder.fulfillmentStatus === 'fulfilled' ? 'unfulfilled' : 'fulfilled'
                        )}
                        className={`flex-row items-center justify-between p-5 rounded-2xl mb-4 ${
                          selectedOrder.fulfillmentStatus === 'fulfilled' 
                            ? 'bg-green-600' 
                            : 'bg-gray-100 border-2 border-gray-200'
                        }`}
                      >
                        <View className="flex-row items-center">
                          <View className={`w-8 h-8 rounded-full mr-4 items-center justify-center ${
                            selectedOrder.fulfillmentStatus === 'fulfilled' ? 'bg-white' : 'bg-gray-300'
                          }`}>
                            <Feather 
                              name={selectedOrder.fulfillmentStatus === 'fulfilled' ? 'check' : 'package'} 
                              size={18} 
                              color={selectedOrder.fulfillmentStatus === 'fulfilled' ? '#16a34a' : '#6b7280'} 
                            />
                          </View>
                          <View>
                            <Text className={`text-lg font-semibold ${
                              selectedOrder.fulfillmentStatus === 'fulfilled' ? 'text-white' : 'text-gray-900'
                            }`}>
                              {selectedOrder.fulfillmentStatus === 'fulfilled' ? 'Fulfilled' : 'Mark as Fulfilled'}
                            </Text>
                            <Text className={`text-sm ${
                              selectedOrder.fulfillmentStatus === 'fulfilled' ? 'text-green-100' : 'text-gray-500'
                            }`}>
                              {selectedOrder.fulfillmentStatus === 'fulfilled' ? 'Tap to undo' : 'Items ready for pickup/delivery'}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>

                      {/* Mark as Paid/Unpaid */}
                      <TouchableOpacity
                        onPress={() => updateOrderStatus('paymentStatus', 
                          selectedOrder.paymentStatus === 'paid' ? 'unpaid' : 'paid'
                        )}
                        className={`flex-row items-center justify-between p-5 rounded-2xl ${
                          selectedOrder.paymentStatus === 'paid' 
                            ? 'bg-green-600' 
                            : 'bg-gray-100 border-2 border-gray-200'
                        }`}
                      >
                        <View className="flex-row items-center">
                          <View className={`w-8 h-8 rounded-full mr-4 items-center justify-center ${
                            selectedOrder.paymentStatus === 'paid' ? 'bg-white' : 'bg-gray-300'
                          }`}>
                            <Feather 
                              name={selectedOrder.paymentStatus === 'paid' ? 'check' : 'credit-card'} 
                              size={18} 
                              color={selectedOrder.paymentStatus === 'paid' ? '#16a34a' : '#6b7280'} 
                            />
                          </View>
                          <View>
                            <Text className={`text-lg font-semibold ${
                              selectedOrder.paymentStatus === 'paid' ? 'text-white' : 'text-gray-900'
                            }`}>
                              {selectedOrder.paymentStatus === 'paid' ? 'Paid' : 'Mark as Paid'}
                            </Text>
                            <Text className={`text-sm ${
                              selectedOrder.paymentStatus === 'paid' ? 'text-green-100' : 'text-gray-500'
                            }`}>
                              {selectedOrder.paymentStatus === 'paid' ? 'Tap to undo' : 'Payment received'}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    </View>

                    {/* Current Status Display */}
                    <View className="border-t border-gray-200 pt-4">
                      <Text className="text-sm font-medium text-gray-500 mb-2">Current Status</Text>
                      <View className="flex-row items-center">
                        <View className={`px-3 py-1 rounded-full mr-2 ${
                          selectedOrder.status === 'open' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          <Text className="text-sm font-medium">
                            {selectedOrder.status === 'open' ? 'Open' : 'Closed'}
                          </Text>
                        </View>
                        {selectedOrder.status === 'closed' && (
                          <Text className="text-sm text-gray-500">• Order Complete</Text>
                        )}
                      </View>
                    </View>
                  </View>
                )}
              </Animated.View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
