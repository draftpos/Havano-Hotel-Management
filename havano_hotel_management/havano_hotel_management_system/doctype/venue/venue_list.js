frappe.listview_settings['Venue'] = {
    onload: function(listview) {
        check_overdue_checkouts();
        update_status_counts();
        // Switch to the existing "Venue View" kanban view on load
        frappe.set_route("List", "Venue", "Kanban", "Venue View");
    
    },
   
    list_view_settings: {
        fields: ["name", "venue_name", "status", "checkout_date", "current_guest"]
    },
    refresh: function(listview) {
        // Add custom button to refresh status counts
        update_status_counts();
        
        // Then highlight overdue checkouts (after sorting)
        highlight_overdue_checkouts();
    },
    
};

// Function to sort occupied venues by checkout status (overdue first)
function sort_occupied_venues_by_checkout_status() {
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
            doctype: "Venue",
            fields: ["status"],
            limit: 1000
        },
        callback: function(r) {
            if (r.message) {
                // Count venues by status
                let status_counts = {};
                r.message.forEach(venue => {
                    if (!status_counts[venue.status]) {
                        status_counts[venue.status] = 0;
                    }
                    status_counts[venue.status]++;
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

// Function to check for overdue checkouts
function check_overdue_checkouts() {
    console.log("Checking for overdue checkouts...");
    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Venue",
            filters: {
                status: "Occupied"
            },
            fields: ["name", "checkout_date"]
        },
        callback: function(r) {
            if (r.message && r.message.length > 0) {
                const today = frappe.datetime.get_today();
                const today_obj = frappe.datetime.str_to_obj(today);
                // Filter venues with checkout date < today
                const overdue_venues = r.message.filter(venue => {
                    if (!venue.checkout_date) return false;
                    const checkout_date = frappe.datetime.str_to_obj(venue.checkout_date);
                    return checkout_date < today_obj;
                });
                
                // Update overdue venues
                if (overdue_venues.length > 0) {
                    overdue_venues.forEach(venue => {
                        frappe.db.set_value("Venue", venue.name, "checkout_status", "Overdue")
                            .then(() => {
                                console.log(`Venue ${venue.name} marked as overdue`);
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
