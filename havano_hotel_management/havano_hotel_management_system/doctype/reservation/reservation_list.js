// Copyright (c) 2025, Alphazen Technologies and contributors
// For license information, please see license.txt

frappe.listview_settings['Reservation'] = {
    refresh: function(listview) {
        // Call endpoint to mark rooms reserved for today
        // frappe.call({
        //     method: 'havano_hotel_management.api.mark_rooms_reserved_for_today',
        //     callback: function(r) {
        //         console.log('Room status update response:', r);
        //         if (r.message) {
                    
        //             if (r.message.success && r.message.updated_count > 0) {
        //                 frappe.show_alert({
        //                     message: r.message.message,
        //                     indicator: 'green'
        //                 }, 3);
        //             } else if (r.message.success && r.message.updated_count === 0) {
        //                 // Show info if no updates but still successful
        //                 console.log('No rooms updated. Debug info available in console.');
        //             }
        //         }
        //     },
        //     error: function(r) {
        //         // Silently fail - don't interrupt user
        //         console.error('Error updating room statuses:', r);
        //     }
        // });
    }
};
