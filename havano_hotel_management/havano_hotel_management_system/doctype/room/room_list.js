

frappe.listview_settings['Room'] = {
    onload: function(listview) {
        // check_overdue_checkouts();
        // update_status_counts();
        // Switch to the existing "Room View" kanban view on load
        // frappe.set_route("List", "Room", "Kanban", "Room View");
    
    },
   
    list_view_settings: {
        fields: ["name", "room_number", "status", "checkout_date", "room_type", "current_guest", "housekeeping_status"]
    },
    refresh: function(listview) {
        // Add custom button to refresh status counts
        // update_status_counts();
        
        // Then highlight overdue checkouts (after sorting)
        // highlight_overdue_checkouts();
        
        // Add button to clear room data
        listview.page.add_button(__("Clear Room Data"), function() {
            clear_room_data(listview);
        });
    },
    
};

// Function to sort occupied rooms by checkout status (overdue first)
function sort_occupied_rooms_by_checkout_status() {
    // Wait for the Kanban view to be fully rendered
    setTimeout(() => {
        // Find the "Occupied" column
        const $occupiedColumn = $('.kanban-column').filter(function() {
            return $(this).find('.kanban-column-title').text().trim().startsWith('Occupied');
        });
        
        if ($occupiedColumn.length) {
            const $cards = $occupiedColumn.find('.kanban-card');
            
            // Sort the cards: Overdue first, then others
            $cards.sort(function(a, b) {
                const isOverdueA = $(a).find('span:contains("Overdue")').length > 0;
                const isOverdueB = $(b).find('span:contains("Overdue")').length > 0;
                
                if (isOverdueA && !isOverdueB) return -1; // A is overdue, B is not
                if (!isOverdueA && isOverdueB) return 1;  // B is overdue, A is not
                return 0; // Both are overdue or both are not overdue
            });
            
            // Reattach the sorted cards to the column
            const $cardContainer = $occupiedColumn.find('.kanban-cards');
            $cards.detach().appendTo($cardContainer);
        }
    }, 800); // Delay to ensure Kanban view is fully rendered
}

// Function to update the status counts in Kanban board titles
function update_status_counts() {
    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Room",
            fields: ["status"],
            limit: 1000
        },
        callback: function(r) {
            if (r.message) {
                // Count rooms by status
                let status_counts = {};
                r.message.forEach(room => {
                    if (!status_counts[room.status]) {
                        status_counts[room.status] = 0;
                    }
                    status_counts[room.status]++;
                });
                
                // Update Kanban board column titles with counts
                setTimeout(() => {
                    $('.kanban-column').each(function() {
                        const $title = $(this).find('.kanban-column-title');
                        const status = $title.text().trim();
                        
                        if (status_counts[status] !== undefined) {
                            const count = status_counts[status];
                            // Check if count is already appended
                            if (!$title.find('.column-count').length) {
                                $title.append(`<span class="column-count"> (${count})</span>`);
                            } else {
                                $title.find('.column-count').text(` (${count})`);
                            }
                        }
                    });
                }, 500); // Small delay to ensure Kanban view is fully rendered
            }
        }
    });
}

function highlight_overdue_checkouts() {
    setTimeout(() => {
        $('.kanban-card').each(function() {
            const $card = $(this);
            // Look for checkout status in the card
            const $checkoutStatus = $card.find('.kanban-card-doc').find('span:contains("Checkout Status:")');
            const $checkoutStatus2 = $card.find('.kanban-card-doc').find('span:contains("Overdue:")');
            const $houseStatus = $card.find('.kanban-card-doc').find('span:contains("Dirty")');
            const $houseStatus2 = $card.find('.kanban-card-doc').find('span:contains("Clean")');
            const $houseKeep = $card.find('.kanban-card-doc').find('span:contains("HouseKeeping Status:")');
            
            if ($checkoutStatus2.length) {
                const statusText = $checkoutStatus2.text();
                if (statusText.includes("Overdue")) {
                    // Apply red background to the checkout status span
                    $checkoutStatus2.css({
                        'background-color': 'red',
                        'color': 'white',
                        'padding': '2px 6px',
                        'border-radius': '4px',
                        'font-weight': 'bold'
                    });
                    if($checkoutStatus.length){
                        $checkoutStatus.css({
                            'background-color': 'red',
                            'color': 'white',
                            'padding': '2px 6px',
                            'border-radius': '4px',
                            'font-weight': 'bold'
                        });
                    }
                }
            }

            if ($houseStatus.length) {
                const statusText = $houseStatus.text();
                
                if (statusText.includes("Dirty")) {
                    
                    // Apply red background to the checkout status span
                    $houseStatus.css({
                        'background-color': 'red',
                        'color': 'white',
                        'padding': '2px 6px',
                        'border-radius': '4px',
                        'font-weight': 'bold'
                    });

                    if($houseKeep.length){
                        $houseKeep.css({
                            'background-color': 'red',
                            'color': 'white',
                            'padding': '2px 6px',
                            'border-radius': '4px',
                            'font-weight': 'bold'
                        });
                    }

                    // )
                }
            }
            if($houseStatus2.length){
                const statusText = $houseStatus2.text();
                if (statusText.includes("Clean")) {
                    
                    // Apply red background to the checkout status span
                    $houseStatus2.css({
                        'background-color': 'green',
                        'color': 'white',
                        'padding': '2px 6px',
                        'border-radius': '4px',
                        'font-weight': 'bold'
                    });
                    if($houseKeep.length){
                        $houseKeep.css({
                            'background-color': 'green',
                            'color': 'white',
                            'padding': '2px 6px',
                            'border-radius': '4px',
                            'font-weight': 'bold'
                        });
                    }
                }
            }
        });
    }, 1000); // Increased delay to ensure cards are rendered and sorted
}

// Function to clear room data
function clear_room_data(listview) {
    // Get selected rooms (returns array of docnames)
    let selected_rooms = listview.get_checked_items(true);
    
    // If no rooms selected, ask if user wants to clear all visible rooms
    if (selected_rooms.length === 0) {
        frappe.confirm(
            __("No rooms selected. Do you want to clear data for all visible rooms?"),
            function() {
                // Get all visible rooms
                selected_rooms = listview.data.map(function(row) {
                    return row.name;
                });
                
                if (selected_rooms.length === 0) {
                    frappe.show_alert({
                        message: __("No rooms found to clear."),
                        indicator: "orange"
                    }, 5);
                    return;
                }
                
                proceed_with_clear(selected_rooms, listview);
            }
        );
    } else {
        // Confirm clearing selected rooms
        frappe.confirm(
            __("Are you sure you want to clear data for {0} selected room(s)? This will set Checkout Status, Current Guest, Checkout Date, Current Checkin to empty and Status to Available.", [selected_rooms.length]),
            function() {
                proceed_with_clear(selected_rooms, listview);
            }
        );
    }
}

// Function to proceed with clearing room data
function proceed_with_clear(room_names, listview) {
    if (!room_names || room_names.length === 0) {
        frappe.show_alert({
            message: __("No rooms selected."),
            indicator: "orange"
        }, 5);
        return;
    }
    
    // Show progress
    frappe.show_alert({
        message: __("Clearing room data..."),
        indicator: "blue"
    }, 2);
    
    // Clear data for each room
    let promises = room_names.map(function(room_name) {
        return frappe.call({
            method: "frappe.client.set_value",
            args: {
                doctype: "Room",
                name: room_name,
                fieldname: {
                    checkout_status: "",
                    current_guest: "",
                    checkout_date: "",
                    status: "Available",
                    current_checkin: "",
                    reservation: ""
                }
            }
        });
    });
    
    // Wait for all updates to complete
    Promise.all(promises).then(function() {
        frappe.show_alert({
            message: __("Room data cleared successfully for {0} room(s).", [room_names.length]),
            indicator: "green"
        }, 5);
        
        // Refresh the list view
        setTimeout(function() {
            listview.refresh();
        }, 500);
    }).catch(function(error) {
        frappe.show_alert({
            message: __("Error clearing room data: {0}", [error.message || "Unknown error"]),
            indicator: "red"
        }, 5);
    });
}

// Function to check for overdue checkouts
function check_overdue_checkouts() {
    console.log("Checking for overdue checkouts...");
    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Room",
            filters: {
                status: "Occupied"
            },
            fields: ["name", "checkout_date"]
        },
        callback: function(r) {
            if (r.message && r.message.length > 0) {
                const today = frappe.datetime.get_today();
                const today_obj = frappe.datetime.str_to_obj(today);
                // Filter rooms with checkout date < today
                const overdue_rooms = r.message.filter(room => {
                    if (!room.checkout_date) return false;
                    const checkout_date = frappe.datetime.str_to_obj(room.checkout_date);
                    return checkout_date < today_obj;
                });
                
                // Update overdue rooms
                if (overdue_rooms.length > 0) {
                    overdue_rooms.forEach(room => {
                        frappe.db.set_value("Room", room.name, "checkout_status", "Overdue")
                            .then(() => {
                                console.log(`Room ${room.name} marked as overdue`);
                            });
                    });
                    
                    // Refresh the list view after updates
                    setTimeout(() => {
                        cur_list.refresh();
                    }, 1000);
                }
            }
        }
    });
}
