frappe.pages['hotel-dashboard'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Hotel Dashboard',
		single_column: true
	});

	let me = this;
	me.page = page;
	
	// Add padding to page
	page.main.css("padding", "8px");
	
	// Add menu buttons to page menu
	me.make_menu_buttons(page);
	
	// Initialize dashboard
	me.make_dashboard(page);
};

frappe.pages['hotel-dashboard'].make_menu_buttons = function(page) {
	let me = this;
	
	// Create enterprise-style menu container
	setTimeout(function() {
		let page_actions = $(".page-actions");
		if (page_actions.length) {
			// Add custom CSS for enterprise menu styling
			if (!$("#hotel-dashboard-menu-styles").length) {
				$("head").append(`
					<style id="hotel-dashboard-menu-styles">
						.page-actions.hotel-menu {
							display: flex;
							align-items: center;
							gap: 8px;
							flex-wrap: wrap;
						}
						.page-actions.hotel-menu .btn-group {
							display: inline-flex;
							align-items: center;
							gap: 8px;
							margin-left: 0;
						}
						.page-actions.hotel-menu .menu-separator {
							width: 1px;
							height: 20px;
							background: linear-gradient(to bottom, transparent, #d1d5db, transparent);
							margin: 0 3px;
						}
						.page-actions.hotel-menu .btn-enterprise {
							background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
							color: #ffffff;
							border: 1px solid #1e3a8a;
							border-radius: 4px;
							padding: 3px 8px;
							font-weight: 500;
							font-size: 14px;
							height: 24px;
							display: inline-flex;
							align-items: center;
							gap: 4px;
							transition: all 0.2s ease;
							box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
							min-width: auto;
							white-space: nowrap;
						}
						.page-actions.hotel-menu .btn-enterprise:hover {
							background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
							border-color: #2563eb;
							box-shadow: 0 2px 4px rgba(30, 64, 175, 0.25);
							transform: translateY(-1px);
						}
						.page-actions.hotel-menu .btn-enterprise:active {
							transform: translateY(0);
							box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
						}
						.page-actions.hotel-menu .btn-enterprise i {
							font-size: 14px;
							opacity: 0.95;
						}
						.page-actions.hotel-menu .btn-enterprise.primary {
							background: linear-gradient(135deg, #059669 0%, #047857 100%);
							border-color: #047857;
						}
						.page-actions.hotel-menu .btn-enterprise.primary:hover {
							background: linear-gradient(135deg, #10b981 0%, #059669 100%);
							border-color: #10b981;
							box-shadow: 0 4px 6px rgba(5, 150, 105, 0.25);
						}
						.page-actions.hotel-menu .btn-enterprise.warning {
							background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
							border-color: #b45309;
						}
						.page-actions.hotel-menu .btn-enterprise.warning:hover {
							background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
							border-color: #f59e0b;
							box-shadow: 0 4px 6px rgba(217, 119, 6, 0.25);
						}
						.page-actions.hotel-menu .btn-enterprise.secondary {
							background: linear-gradient(135deg, #4b5563 0%, #374151 100%);
							border-color: #374151;
						}
						.page-actions.hotel-menu .btn-enterprise.secondary:hover {
							background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
							border-color: #6b7280;
							box-shadow: 0 4px 6px rgba(75, 85, 99, 0.25);
						}
						.page-actions.hotel-menu .btn-enterprise:disabled {
							opacity: 0.5;
							cursor: not-allowed;
							transform: none !important;
						}
					</style>
				`);
			}
			
			page_actions.addClass("hotel-menu");
		}
	}, 50);
	
	// Group 1: Core Operations (Check In, Check Out)
	page.add_button(`<i class="fa fa-sign-in"></i> <span>${__("Check In")}</span>`, function() {
		me.handle_check_in();
	}, {
		btn_class: "btn-enterprise primary"
	});
	
	page.add_button(`<i class="fa fa-sign-out"></i> <span>${__("Check Out")}</span>`, function() {
		me.handle_check_out();
	}, {
		btn_class: "btn-enterprise warning"
	});
	
	// Add separator
	setTimeout(function() {
		$(".page-actions").append('<div class="menu-separator"></div>');
	}, 100);
	
	// Group 2: Reservations
	page.add_button(`<i class="fa fa-calendar-plus-o"></i> <span>${__("Make Reservation")}</span>`, function() {
		me.handle_make_reservation();
	}, {
		btn_class: "btn-enterprise"
	});
	
	// Add separator
	setTimeout(function() {
		$(".page-actions").append('<div class="menu-separator"></div>');
	}, 150);
	
	// Group 3: Financial Operations
	// Store reference to Make Payment button
	me.make_payment_btn = page.add_button(`<i class="fa fa-money"></i> <span>${__("Make Payment")}</span>`, function() {
		me.handle_make_payment();
	}, {
		btn_class: "btn-enterprise primary",
		id: "btn-make-payment"
	});
	
	page.add_button(`<i class="fa fa-plus-circle"></i> <span>${__("Xtra Charge")}</span>`, function() {
		me.handle_extra_charge();
	}, {
		btn_class: "btn-enterprise secondary"
	});
	
	// Add separator
	setTimeout(function() {
		$(".page-actions").append('<div class="menu-separator"></div>');
	}, 200);
	
	// Group 4: Room Management
	page.add_button(`<i class="fa fa-exchange"></i> <span>${__("Move Room")}</span>`, function() {
		me.handle_move_room();
	}, {
		btn_class: "btn-enterprise"
	});
	
	page.add_button(`<i class="fa fa-calendar-check-o"></i> <span>${__("Extend Stay")}</span>`, function() {
		me.handle_extend_stay();
	}, {
		btn_class: "btn-enterprise"
	});
}

frappe.pages['hotel-dashboard'].handle_check_in = function() {
	let me = this;
	
	// Get all checked rooms
	let checked_rooms = [];
	$(".room-checkbox:checked").each(function() {
		let room_name = $(this).data("room");
		if (room_name && me.rooms_data && me.rooms_data[room_name]) {
			checked_rooms.push(me.rooms_data[room_name]);
		}
	});
	
	// Validate: exactly 1 room selected
	if (checked_rooms.length === 0) {
		frappe.show_alert({
			message: __("Please select a room to check in."),
			indicator: "orange"
		}, 5);

		return;
	}
	
	if (checked_rooms.length > 1) {
		frappe.show_alert({
			message: __("Please select only one room to check in."),
			indicator: "orange"
		}, 5);

		return;
	}
	
	let selected_room = checked_rooms[0];
	let room_status = selected_room.status || "Available";
	
	// Validate: room must be vacant or reserved
	if (room_status !== "Available" && room_status !== "Vacant" && room_status !== "Reserved") {
		frappe.show_alert({
			message: __("Room {0} is {1}. Only vacant or reserved rooms can be checked in.", [selected_room.room, room_status]),
			indicator: "red"
		}, 5);

		return;
	}
	
	// Validate: reserved rooms must have a reservation
	if (room_status === "Reserved" && !selected_room.reservation) {
		frappe.show_alert({
			message: __("Room {0} is reserved but no reservation is linked. Please link a reservation first.", [selected_room.room]),
			indicator: "red"
		}, 5);

		return;
	}
	
	// Get room details first to get rate, then create document
	frappe.call({
		method: "frappe.client.get",
		args: {
			doctype: "Room",
			name: selected_room.room_name
		},
		callback: function(room_r) {
			if (!room_r.message) {
				frappe.show_alert({
					message: __("Failed to fetch room details."),
					indicator: "red"
				}, 5);

				return;
			}
			
			let room_doc = room_r.message;
			
			// Store room and reservation in sessionStorage for the new tab
			// Only pass reservation for reserved rooms, not for vacant rooms
			sessionStorage.setItem('check_in_room', selected_room.room_name);
			if (room_status === "Reserved" && selected_room.reservation) {
				sessionStorage.setItem('check_in_reservation', selected_room.reservation);
			} else {
				sessionStorage.removeItem('check_in_reservation');
			}
			
			// Open Check In form in new tab
			frappe.model.with_doctype("Check In", function() {
				let check_in = frappe.model.get_new_doc("Check In");
				let url = frappe.urllib.get_full_url("/app/check-in/" + encodeURIComponent(check_in.name));
				window.open(url, '_blank');
			});
		},
		error: function() {
			frappe.show_alert({
				message: __("Failed to fetch room details."),
				indicator: "red"
			}, 5);

		}
	});
}

frappe.pages['hotel-dashboard'].handle_make_reservation = function() {
	let me = this;
	
	// Get all checked rooms
	let checked_rooms = [];
	$(".room-checkbox:checked").each(function() {
		let room_name = $(this).data("room");
		if (room_name && me.rooms_data && me.rooms_data[room_name]) {
			checked_rooms.push(me.rooms_data[room_name]);
		}
	});
	
	// Validate: exactly 1 room selected
	if (checked_rooms.length === 0) {
		frappe.show_alert({
			message: __("Please select a room to make a reservation."),
			indicator: "orange"
		}, 5);

		return;
	}
	
	if (checked_rooms.length > 1) {
		frappe.show_alert({
			message: __("Please select only one room to make a reservation."),
			indicator: "orange"
		}, 5);

		return;
	}
	
	let selected_room = checked_rooms[0];
	let room_status = selected_room.status || "Available";
	
	// Get room details to check current arrival/departure dates
	frappe.call({
		method: "frappe.client.get",
		args: {
			doctype: "Room",
			name: selected_room.room_name,
			fieldname: ["current_checkin", "reservation", "checkout_date"]
		},
		callback: function(room_r) {
			if (!room_r.message) {
				frappe.show_alert({
					message: __("Failed to fetch room details."),
					indicator: "red"
				}, 5);

				return;
			}
			
			let room_doc = room_r.message;
			let current_arrival = null;
			let current_departure = null;
			
			// Get current dates from check-in if available
			if (room_doc.current_checkin) {
				frappe.call({
					method: "frappe.client.get",
					args: {
						doctype: "Check In",
						name: room_doc.current_checkin,
						fieldname: ["check_in_date", "check_out_date"]
					},
					callback: function(checkin_r) {
						if (checkin_r.message) {
							current_arrival = checkin_r.message.check_in_date;
							current_departure = checkin_r.message.check_out_date;
						}
						me.create_reservation_dialog(selected_room, current_arrival, current_departure);
					},
					error: function() {
						// If check-in fetch fails, try reservation
						if (room_doc.reservation) {
							frappe.call({
								method: "frappe.client.get",
								args: {
									doctype: "Reservation",
									name: room_doc.reservation,
									fieldname: ["check_in_date", "check_out_date"]
								},
								callback: function(reservation_r) {
									if (reservation_r.message) {
										current_arrival = reservation_r.message.check_in_date;
										current_departure = reservation_r.message.check_out_date;
									}
									me.create_reservation_dialog(selected_room, current_arrival, current_departure);
								},
								error: function() {
									me.create_reservation_dialog(selected_room, null, null);
								}
							});
						} else {
							me.create_reservation_dialog(selected_room, null, null);
						}
					}
				});
			} else if (room_doc.reservation) {
				// Get dates from reservation if no check-in
				frappe.call({
					method: "frappe.client.get",
					args: {
						doctype: "Reservation",
						name: room_doc.reservation,
						fieldname: ["check_in_date", "check_out_date"]
					},
					callback: function(reservation_r) {
						if (reservation_r.message) {
							current_arrival = reservation_r.message.check_in_date;
							current_departure = reservation_r.message.check_out_date;
						}
						me.create_reservation_dialog(selected_room, current_arrival, current_departure);
					},
					error: function() {
						me.create_reservation_dialog(selected_room, null, null);
					}
				});
			} else {
				// No current booking
				me.create_reservation_dialog(selected_room, null, null);
			}
		},
		error: function() {
			frappe.show_alert({
				message: __("Failed to fetch room details."),
				indicator: "red"
			}, 5);

		}
	});
}

frappe.pages['hotel-dashboard'].create_reservation_dialog = function(selected_room, current_arrival, current_departure) {
	let me = this;
	
	// Create modal dialog for reservation
	let dialog_fields = [
		{
			fieldtype: "Link",
			fieldname: "room",
			label: __("Room"),
			options: "Room",
			default: selected_room.room_name,
			read_only: 1,
			reqd: 1
		}
	];
	
	// Add current booking info if available
	if (current_arrival && current_departure) {
		let curr_arrival_date = frappe.datetime.str_to_obj(current_arrival);
		let curr_departure_date = frappe.datetime.str_to_obj(current_departure);
		dialog_fields.push({
			fieldtype: "HTML",
			fieldname: "current_booking_info",
			options: `<div style="padding: 8px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; margin-bottom: 10px;">
				<strong style="font-size: 15px; color: #856404;">Current Booking:</strong>
				<div style="font-size: 14px; color: #856404; margin-top: 4px;">
					${frappe.datetime.obj_to_str(curr_arrival_date).split(' ')[0]} to ${frappe.datetime.obj_to_str(curr_departure_date).split(' ')[0]}
				</div>
				<div style="font-size: 13px; color: #856404; margin-top: 2px;">
					Reservation dates must be outside this period.
				</div>
			</div>`
		});
	}
	
	dialog_fields.push(
		{
			fieldtype: "Link",
			fieldname: "guest",
			label: __("Guest"),
			options: "Hotel Guest",
			reqd: 1,
			get_query: function() {
				return {
					filters: {}
				};
			}
		},
		{
			fieldtype: "Datetime",
			fieldname: "check_in_date",
			label: __("Check In Date"),
			default: frappe.datetime.now_datetime(),
			reqd: 1
		},
		{
			fieldtype: "Date",
			fieldname: "check_out_date",
			label: __("Check Out Date"),
			reqd: 1
		},
		{
			fieldtype: "Int",
			fieldname: "nights",
			label: __("Nights"),
			default: 1,
			reqd: 1
		}
	);
	
	let dialog = new frappe.ui.Dialog({
		fields: dialog_fields,
		primary_action_label: __("Create Reservation"),
		primary_action: function() {
			let values = dialog.get_values();
			if (!values) {
				return;
			}
			
			// Validate required fields
			if (!values.guest) {
				frappe.show_alert({
					message: __("Please select a guest."),
					indicator: "orange"
				}, 5);

				return;
			}
			
			if (!values.check_out_date) {
				frappe.show_alert({
					message: __("Please select a check out date."),
					indicator: "orange"
				}, 5);

				return;
			}
			
			// Validate dates don't overlap with current booking
			if (current_arrival && current_departure) {
				let new_check_in = frappe.datetime.str_to_obj(values.check_in_date);
				let new_check_out = frappe.datetime.str_to_obj(values.check_out_date);
				let curr_arrival = frappe.datetime.str_to_obj(current_arrival);
				let curr_departure = frappe.datetime.str_to_obj(current_departure);
				
				// Extract dates only (ignore time) for comparison
				let new_check_in_date = frappe.datetime.obj_to_str(new_check_in).split(' ')[0];
				let new_check_out_date = frappe.datetime.obj_to_str(new_check_out).split(' ')[0];
				let curr_arrival_date = frappe.datetime.obj_to_str(curr_arrival).split(' ')[0];
				let curr_departure_date = frappe.datetime.obj_to_str(curr_departure).split(' ')[0];
				
				// Convert back to date objects for comparison
				new_check_in = frappe.datetime.str_to_obj(new_check_in_date);
				new_check_out = frappe.datetime.str_to_obj(new_check_out_date);
				curr_arrival = frappe.datetime.str_to_obj(curr_arrival_date);
				curr_departure = frappe.datetime.str_to_obj(curr_departure_date);
				
				// Check if new reservation dates overlap with current dates
				// Overlap occurs if: new_check_in < curr_departure AND new_check_out > curr_arrival
				// This blocks dates that fall between arrival and departure
				if (new_check_in < curr_departure && new_check_out > curr_arrival) {
					frappe.show_alert({
						message: __("Reservation dates cannot overlap with current booking period ({0} to {1}). Please select dates outside this period.", [
							curr_arrival_date,
							curr_departure_date
						]),
						indicator: "red"
					}, 5);
					return;
				}
			}
			
			// Disable button and show processing
			let primary_btn = dialog.get_primary_btn();
			let original_label = primary_btn.html();
			primary_btn.prop("disabled", true).html(__("Processing..."));
			
			// Create and submit reservation using Python API
			frappe.call({
				method: "havano_hotel_management.api.create_and_submit_reservation",
				args: {
					room: values.room,
					guest: values.guest,
					check_in_date: values.check_in_date,
					check_out_date: values.check_out_date,
					nights: values.nights || 1,
					reservation_type: "Room"
				},
				
				freeze_message: __("Creating and Submitting Reservation..."),
				callback: function(r) {
					if (r.message && r.message.success) {
						dialog.hide();
						frappe.show_alert({
							message: r.message.message || __("Reservation created and submitted successfully."),
							indicator: "green"
						}, 5);

						// Refresh dashboard
						setTimeout(function() {
							me.load_stats();
							me.load_rooms();
						}, 500);
					} else {
						// Re-enable button
						primary_btn.prop("disabled", false).html(original_label);
						let error_msg = r.message.message || r.message.error || __("Failed to create reservation.");
						frappe.show_alert({
							message: error_msg,
							indicator: "red"
						}, 5);

					}
				},
				error: function(r) {
					// Re-enable button
					primary_btn.prop("disabled", false).html(original_label);
					let error_msg = __("Failed to create reservation.");
					if (r.message && r.message.exc) {
						error_msg += " " + r.message.exc;
					}
					frappe.show_alert({
						message: error_msg,
						indicator: "red"
					}, 5);

				}
			});
		}
	});
	
	dialog.show();
	
	// Calculate dates and nights when fields change
	setTimeout(function() {
		// Function to calculate checkout date from check-in date and nights
		function calculateCheckoutDate() {
			let nights = parseInt(dialog.get_value("nights")) || 1;
			let check_in_date = dialog.get_value("check_in_date");
			if (check_in_date) {
				let check_in = frappe.datetime.str_to_obj(check_in_date);
				// Extract just the date part for checkout
				let check_in_date_only = frappe.datetime.obj_to_str(check_in).split(' ')[0];
				let check_in_obj = frappe.datetime.str_to_obj(check_in_date_only);
				let check_out = frappe.datetime.add_days(check_in_obj, nights);
				// Set as date only (no time)
				dialog.set_value("check_out_date", frappe.datetime.obj_to_str(check_out).split(' ')[0]);
			}
		}
		
		// Function to calculate nights from check-in date and checkout date
		function calculateNights() {
			let check_in_date = dialog.get_value("check_in_date");
			let check_out_date = dialog.get_value("check_out_date");
			if (check_in_date && check_out_date) {
				// Extract date parts only (ignore time)
				let check_in_str = frappe.datetime.str_to_obj(check_in_date);
				let check_in_date_only = frappe.datetime.obj_to_str(check_in_str).split(' ')[0];
				let check_out_date_only = check_out_date.split(' ')[0];
				
				let check_in = frappe.datetime.str_to_obj(check_in_date_only);
				let check_out = frappe.datetime.str_to_obj(check_out_date_only);
				let nights = frappe.datetime.get_diff(check_out, check_in);
				if (nights > 0) {
					dialog.set_value("nights", nights);
				} else if (nights === 0) {
					dialog.set_value("nights", 1);
				}
			}
		}
		
		// Calculate checkout date when nights changes
		if (dialog.fields_dict.nights && dialog.fields_dict.nights.$input) {
			dialog.fields_dict.nights.$input.on("change input", function() {
				calculateCheckoutDate();
			});
		}
		
		// Calculate nights when checkout date changes
		if (dialog.fields_dict.check_out_date && dialog.fields_dict.check_out_date.$input) {
			dialog.fields_dict.check_out_date.$input.on("change", function() {
				calculateNights();
			});
		}
		
		// Recalculate when check-in date changes
		if (dialog.fields_dict.check_in_date && dialog.fields_dict.check_in_date.$input) {
			dialog.fields_dict.check_in_date.$input.on("change", function() {
				// If nights is set, recalculate checkout date
				let nights = parseInt(dialog.get_value("nights")) || 0;
				if (nights > 0) {
					calculateCheckoutDate();
				} else {
					// If checkout date is set, recalculate nights
					let check_out_date = dialog.get_value("check_out_date");
					if (check_out_date) {
						calculateNights();
					}
				}
			});
		}
	}, 100);
}

frappe.pages['hotel-dashboard'].handle_check_out = function() {
	let me = this;
	
	// Get all checked rooms
	let checked_rooms = [];
	$(".room-checkbox:checked").each(function() {
		let room_name = $(this).data("room");
		if (room_name && me.rooms_data && me.rooms_data[room_name]) {
			checked_rooms.push(me.rooms_data[room_name]);
		}
	});
	
	// Validate: exactly 1 room selected
	if (checked_rooms.length === 0) {
		frappe.show_alert({
			message: __("Please select a room to check out."),
			indicator: "orange"
		}, 5);

		return;
	}
	
	if (checked_rooms.length > 1) {
		frappe.show_alert({
			message: __("Please select only one room to check out."),
			indicator: "orange"
		}, 5);

		return;
	}
	
	let selected_room = checked_rooms[0];
	let room_status = selected_room.status || "Available";
	
	// Validate: room must be occupied
	if (room_status !== "Occupied" && room_status !== "Due Out") {
		frappe.show_alert({
			message: __("Room {0} is {1}. Only occupied rooms can be checked out.", [selected_room.room, room_status]),
			indicator: "red"
		}, 5);
		return;
	}
	
	// Check Hotel Settings for permit_checkout_with_due and validate balance
	frappe.call({
		method: "frappe.client.get",
		args: {
			doctype: "Hotel Settings",
			name: "Hotel Settings"
		},
		callback: function(settings_r) {
			let permit_checkout_with_due = settings_r.message && settings_r.message.permit_checkout_with_due;
			let total_balance = parseFloat(selected_room.total_balance || 0);
			
			// If permit_checkout_with_due is not checked and balance > 0, block checkout
			if (!permit_checkout_with_due && total_balance > 0) {
				frappe.show_alert({
					message: __("Room {0} has an outstanding balance of {1}. Please collect payment before checkout or enable 'Permit Check-Out with Due Balance' in Hotel Settings.", [
						selected_room.room,
						format_currency(total_balance, frappe.defaults.get_default("currency"))
					]),
					indicator: "red"
				}, 5);
				return;
			}
			
			// Proceed with checkout
			me.proceed_with_checkout(selected_room);
		},
		error: function() {
			// If settings fetch fails, proceed anyway (backward compatibility)
			me.proceed_with_checkout(selected_room);
		}
	});
}

frappe.pages['hotel-dashboard'].proceed_with_checkout = function(selected_room) {
	let me = this;
	
	// Get Check In document for this room
	frappe.call({
		method: "frappe.client.get",
		args: {
			doctype: "Room",
			name: selected_room.room_name,
			fieldname: ["current_checkin"]
		},
		callback: function(room_r) {
			if (!room_r.message || !room_r.message.current_checkin) {
				frappe.show_alert({
					message: __("Room {0} does not have an active check in.", [selected_room.room]),
					indicator: "red"
				}, 5);
				return;
			}
			
			let check_in_name = room_r.message.current_checkin;
			
			// Get Check In details
			frappe.call({
				method: "frappe.client.get",
				args: {
					doctype: "Check In",
					name: check_in_name
				},
				callback: function(checkin_r) {
					if (!checkin_r.message) {
						frappe.show_alert({
							message: __("Failed to fetch check in details."),
							indicator: "red"
						}, 5);

						return;
					}
					
					let check_in_doc = checkin_r.message;
					
					// Create modal dialog for check out
					let dialog = new frappe.ui.Dialog({
						fields: [
							{
								fieldtype: "Link",
								fieldname: "room",
								label: __("Room"),
								options: "Room",
								default: selected_room.room_name,
								read_only: 1
							},
							{
								fieldtype: "Link",
								fieldname: "check_in",
								label: __("Check In"),
								options: "Check In",
								default: check_in_name,
								read_only: 1
							},
							{
								fieldtype: "Link",
								fieldname: "guest",
								label: __("Guest"),
								options: "Hotel Guest",
								default: check_in_doc.guest_name,
								read_only: 1
							},
							{
								fieldtype: "Datetime",
								fieldname: "actual_check_out_time",
								label: __("Actual Check Out Time"),
								default: frappe.datetime.now_datetime(),
								reqd: 1
							},
							{
								fieldtype: "Select",
								fieldname: "room_condition",
								label: __("Room Condition"),
								options: "Clean\nDirty\nMaintenance",
								default: "Clean",
								reqd: 1
							},
							{
								fieldtype: "Small Text",
								fieldname: "notes",
								label: __("Notes")
							}
						],
						primary_action_label: __("Check Out"),
						primary_action: function() {
							let values = dialog.get_values();
							if (!values) {
								return;
							}
							
							// Validate required fields
							if (!values.actual_check_out_time) {
								frappe.show_alert({
									message: __("Please select actual check out time."),
									indicator: "orange"
								}, 5);

								return;
							}
							
							if (!values.room_condition) {
								frappe.show_alert({
									message: __("Please select room condition."),
									indicator: "orange"
								}, 5);

								return;
							}
							
							// Disable button and show processing
							let primary_btn = dialog.get_primary_btn();
							let original_label = primary_btn.html();
							primary_btn.prop("disabled", true).html(__("Processing..."));
							
							// Create and submit check out using Python API
							frappe.call({
								method: "havano_hotel_management.api.create_and_submit_checkout",
								args: {
									check_in: values.check_in,
									actual_check_out_time: values.actual_check_out_time,
									room_condition: values.room_condition,
									notes: values.notes || "",
									check_out_by: frappe.session.user
								},
								
								freeze_message: __("Processing Check Out..."),
								callback: function(r) {
									if (r.message && r.message.checkout_name) {
										dialog.hide();
										frappe.show_alert({
											message: r.message.message || __("Check Out {0} created and submitted successfully.", [r.message.checkout_name]),
											indicator: "green"
										}, 5);

										// Refresh dashboard
										setTimeout(function() {
											me.load_stats();
											me.load_rooms();
										}, 500);
									} else {
										// Re-enable button
										primary_btn.prop("disabled", false).html(original_label);
										let error_msg = r.message.message || r.message.error || __("Failed to create check out.");
										frappe.show_alert({
											message: error_msg,
											indicator: "red"
										}, 5);

									}
								},
								error: function(r) {
									// Re-enable button
									primary_btn.prop("disabled", false).html(original_label);
									let error_msg = __("Failed to create check out.");
									if (r.message && r.message.exc) {
										error_msg += " " + r.message.exc;
									}
									frappe.show_alert({
										message: error_msg,
										indicator: "red"
									}, 5);

								}
							});
						}
					});
					
					dialog.show();
				},
				error: function() {
					frappe.show_alert({
						message: __("Failed to fetch check in details."),
						indicator: "red"
					}, 5);

				}
			});
		},
		error: function() {
			frappe.show_alert({
				message: __("Failed to fetch room details."),
				indicator: "red"
			}, 5);

		}
	});
}

frappe.pages['hotel-dashboard'].handle_extra_charge = function() {
	let me = this;
	
	// Get all checked rooms
	let checked_rooms = [];
	$(".room-checkbox:checked").each(function() {
		let room_name = $(this).data("room");
		if (room_name && me.rooms_data && me.rooms_data[room_name]) {
			checked_rooms.push(me.rooms_data[room_name]);
		}
	});
	
	// Validate: exactly 1 room selected
	if (checked_rooms.length === 0) {
		frappe.show_alert({
			message: __("Please select a room to add extra charges."),
			indicator: "orange"
		}, 5);

		return;
	}
	
	if (checked_rooms.length > 1) {
		frappe.show_alert({
			message: __("Please select only one room to add extra charges."),
			indicator: "orange"
		}, 5);

		return;
	}
	
	let selected_room = checked_rooms[0];
	let room_status = selected_room.status || "Available";
	
	// Validate: room must be occupied
	if (room_status !== "Occupied" && room_status !== "Due Out") {
		frappe.show_alert({
			message: __("Room {0} is {1}. Extra charges can only be added for occupied rooms.", [selected_room.room, room_status]),
			indicator: "red"
		}, 5);
		return;
	}
	
	// Get Check In document for this room
	frappe.call({
		method: "frappe.client.get",
		args: {
			doctype: "Room",
			name: selected_room.room_name,
			fieldname: ["current_checkin"]
		},
		callback: function(room_r) {
			if (!room_r.message || !room_r.message.current_checkin) {
				frappe.show_alert({
					message: __("Room {0} does not have an active check in.", [selected_room.room]),
					indicator: "red"
				}, 5);
				return;
			}
			
			let check_in_name = room_r.message.current_checkin;
			
			// Get Check In details
			frappe.call({
				method: "frappe.client.get",
				args: {
					doctype: "Check In",
					name: check_in_name
				},
				callback: function(checkin_r) {
					if (!checkin_r.message) {
						frappe.show_alert({
							message: __("Failed to fetch check in details."),
							indicator: "red"
						}, 5);

						return;
					}
					
					let check_in_doc = checkin_r.message;
					
					// Get guest customer
					frappe.call({
						method: "frappe.client.get",
						args: {
							doctype: "Hotel Guest",
							name: check_in_doc.guest_name,
							fieldname: ["guest_customer"]
						},
						callback: function(guest_r) {
							if (!guest_r.message || !guest_r.message.guest_customer) {
								frappe.show_alert({
									message: __("Guest {0} does not have a customer linked.", [check_in_doc.guest_name]),
									indicator: "red"
								}, 5);
								return;
							}
							
							// Create Sales Invoice for extra charges (without saving)
							// Store values in sessionStorage to be read by Sales Invoice form
							sessionStorage.setItem('extra_charge_customer', guest_r.message.guest_customer);
							sessionStorage.setItem('extra_charge_check_in', check_in_name);
							sessionStorage.setItem('extra_charge_remarks', `Extra charges for guest staying in Room: ${selected_room.room}`);
							sessionStorage.setItem('extra_charge_due_date', frappe.datetime.get_today());
							
							// Open Sales Invoice form in new tab
							let url = frappe.urllib.get_full_url("/app/sales-invoice/new");
							window.open(url, '_blank');
						},
						error: function() {
							frappe.show_alert({
								message: __("Failed to fetch guest details."),
								indicator: "red"
							}, 5);

						}
					});
				},
				error: function() {
					frappe.show_alert({
						message: __("Failed to fetch check in details."),
						indicator: "red"
					}, 5);

				}
			});
		},
		error: function() {
			frappe.show_alert({
				message: __("Failed to fetch room details."),
				indicator: "red"
			}, 5);

		}
	});
}

frappe.pages['hotel-dashboard'].handle_move_room = function() {
	let me = this;
	
	// Get all checked rooms
	let checked_rooms = [];
	$(".room-checkbox:checked").each(function() {
		let room_name = $(this).data("room");
		if (room_name && me.rooms_data && me.rooms_data[room_name]) {
			checked_rooms.push(me.rooms_data[room_name]);
		}
	});
	
	// Validate: exactly 1 room selected
	if (checked_rooms.length === 0) {
		frappe.show_alert({
			message: __("Please select a room to move."),
			indicator: "orange"
		}, 5);

		return;
	}
	
	if (checked_rooms.length > 1) {
		frappe.show_alert({
			message: __("Please select only one room to move."),
			indicator: "orange"
		}, 5);

		return;
	}
	
	let selected_room = checked_rooms[0];
	let room_status = selected_room.status || "Available";
	
	// Validate: room must be occupied
	if (room_status !== "Occupied" && room_status !== "Due Out") {
		frappe.show_alert({
			message: __("Room {0} is {1}. Only occupied rooms can be moved.", [selected_room.room, room_status]),
			indicator: "red"
		}, 5);
		return;
	}
	
	// Get Room details including guest and reservation
	frappe.call({
		method: "frappe.client.get",
		args: {
			doctype: "Room",
			name: selected_room.room_name,
			fieldname: ["current_checkin", "current_guest", "reservation"]
		},
		callback: function(room_r) {
			if (!room_r.message || !room_r.message.current_checkin) {
				frappe.show_alert({
					message: __("Room {0} does not have an active check in.", [selected_room.room]),
					indicator: "red"
				}, 5);
				return;
			}
			
			let check_in_name = room_r.message.current_checkin;
			let old_room = selected_room.room_name;
			let current_guest = room_r.message.current_guest || "";
			let reservation = room_r.message.reservation || "";
			
			// Get available rooms
			frappe.call({
				method: "frappe.client.get_list",
				args: {
					doctype: "Room",
					filters: {
						status: "Available"
					},
					fields: ["name", "room_number", "room_type"]
				},
				callback: function(rooms_r) {
					if (!rooms_r.message || rooms_r.message.length === 0) {
						frappe.show_alert({
							message: __("No available rooms found to move to."),
							indicator: "orange"
						}, 5);

						return;
					}
					
					let rooms = rooms_r.message.map(function(room) {
						return {
							label: `${room.room_number || room.name} (${room.room_type || ""})`,
							value: room.name
						};
					});
					
					// Create modal dialog
					let dialog = new frappe.ui.Dialog({
						fields: [
							{
								fieldtype: "Link",
								fieldname: "old_room",
								label: __("Current Room"),
								options: "Room",
								default: old_room,
								read_only: 1
							},
							{
								fieldtype: "Select",
								fieldname: "new_room",
								label: __("New Room"),
								options: rooms.map(r => r.label).join("\n"),
								reqd: 1
							}
						],
						primary_action_label: __("Move"),
						primary_action: function() {
							let values = dialog.get_values();
							if (!values) {
								return;
							}
							
							// Get the room name from the selected option
							let selected_room_option = rooms.find(r => r.label === values.new_room);
							if (!selected_room_option) {
								frappe.show_alert({
									message: __("Invalid room selection."),
									indicator: "red"
								}, 5);

								return;
							}
							
							// Disable button and show processing
							let primary_btn = dialog.get_primary_btn();
							let original_label = primary_btn.html();
							primary_btn.prop("disabled", true).html(__("Processing..."));
							
							let new_room_name = selected_room_option.value;
							
							// Update old room to Available and clear guest/reservation
							frappe.call({
								method: "frappe.client.set_value",
								args: {
									doctype: "Room",
									name: old_room,
									fieldname: {
										status: "Available",
										current_checkin: "",
										current_guest: "",
										reservation: ""
									}
								},
								callback: function() {
									// Update new room to Occupied and transfer guest/reservation
									frappe.call({
										method: "frappe.client.set_value",
										args: {
											doctype: "Room",
											name: new_room_name,
											fieldname: {
												status: "Occupied",
												current_checkin: check_in_name,
												current_guest: current_guest,
												reservation: reservation
											}
										},
										callback: function() {
											// Update Check In document
											frappe.call({
												method: "frappe.client.set_value",
												args: {
													doctype: "Check In",
													name: check_in_name,
													fieldname: {
														room: new_room_name
													}
												},
												callback: function() {
													dialog.hide();
													frappe.show_alert({
														message: __("Guest moved to room {0} successfully.", [selected_room_option.label]),
														indicator: "green"
													}, 5);

													// Refresh dashboard
													setTimeout(function() {
														me.load_stats();
														me.load_rooms();
													}, 500);
												},
												error: function() {
													// Re-enable button
													primary_btn.prop("disabled", false).html(original_label);
													frappe.show_alert({
														message: __("Failed to update check in."),
														indicator: "red"
													}, 5);

												}
											});
										},
										error: function() {
											// Re-enable button
											primary_btn.prop("disabled", false).html(original_label);
											frappe.show_alert({
												message: __("Failed to update new room."),
												indicator: "red"
											}, 5);

										}
									});
								},
								error: function() {
									// Re-enable button
									primary_btn.prop("disabled", false).html(original_label);
									frappe.show_alert({
										message: __("Failed to update old room."),
										indicator: "red"
									}, 5);

								}
							});
						}
					});
					
					dialog.show();
				},
				error: function() {
					frappe.show_alert({
						message: __("Failed to fetch available rooms."),
						indicator: "red"
					}, 5);

				}
			});
		},
		error: function() {
			frappe.show_alert({
				message: __("Failed to fetch room details."),
				indicator: "red"
			}, 5);

		}
	});
}

frappe.pages['hotel-dashboard'].handle_extend_stay = function() {
	let me = this;
	
	// Get all checked rooms
	let checked_rooms = [];
	$(".room-checkbox:checked").each(function() {
		let room_name = $(this).data("room");
		if (room_name && me.rooms_data && me.rooms_data[room_name]) {
			checked_rooms.push(me.rooms_data[room_name]);
		}
	});
	
	// Validate: exactly 1 room selected
	if (checked_rooms.length === 0) {
		frappe.show_alert({
			message: __("Please select a room to extend stay."),
			indicator: "orange"
		}, 5);

		return;
	}
	
	if (checked_rooms.length > 1) {
		frappe.show_alert({
			message: __("Please select only one room to extend stay."),
			indicator: "orange"
		}, 5);

		return;
	}
	
	let selected_room = checked_rooms[0];
	let room_status = selected_room.status || "Available";
	
	// Validate: room must be occupied
	if (room_status !== "Occupied" && room_status !== "Due Out") {
		frappe.show_alert({
			message: __("Room {0} is {1}. Only occupied rooms can extend stay.", [selected_room.room, room_status]),
			indicator: "red"
		}, 5);
		return;
	}
	
	// Get Check In document for this room
	frappe.call({
		method: "frappe.client.get",
		args: {
			doctype: "Room",
			name: selected_room.room_name,
			fieldname: ["current_checkin"]
		},
		callback: function(room_r) {
			if (!room_r.message || !room_r.message.current_checkin) {
				frappe.show_alert({
					message: __("Room {0} does not have an active check in.", [selected_room.room]),
					indicator: "red"
				}, 5);
				return;
			}
			
			let check_in_name = room_r.message.current_checkin;
			
			// Get Check In details
			frappe.call({
				method: "frappe.client.get",
				args: {
					doctype: "Check In",
					name: check_in_name
				},
				callback: function(checkin_r) {
					if (!checkin_r.message) {
						frappe.show_alert({
							message: __("Failed to fetch check in details."),
							indicator: "red"
						}, 5);

						return;
					}
					
					let check_in_doc = checkin_r.message;
					let current_checkout = check_in_doc.check_out_date;
					let price_list_rate = parseFloat(check_in_doc.price_list_rate || 0);
					let current_nights = parseInt(check_in_doc.nights || 0);
					
					// Create modal dialog
					let dialog = new frappe.ui.Dialog({
						fields: [
							{
								fieldtype: "Link",
								fieldname: "room",
								label: __("Room"),
								options: "Room",
								default: selected_room.room_name,
								read_only: 1
							},
							{
								fieldtype: "Date",
								fieldname: "current_checkout_date",
								label: __("Current Checkout Date"),
								default: current_checkout,
								read_only: 1
							},
							{
								fieldtype: "Int",
								fieldname: "additional_nights",
								label: __("Additional Nights"),
								default: 1,
								reqd: 1,
								min: 1
							},
							{
								fieldtype: "Date",
								fieldname: "new_checkout_date",
								label: __("New Checkout Date"),
								read_only: 1
							},
							{
								fieldtype: "Currency",
								fieldname: "additional_charge",
								label: __("Additional Charge"),
								read_only: 1
							}
						],
						primary_action_label: __("Extend Stay"),
						primary_action: function() {
							let values = dialog.get_values();
							if (!values) {
								return;
							}
							
							if (!values.additional_nights || values.additional_nights <= 0) {
								frappe.show_alert({
									message: __("Please enter a valid number of additional nights."),
									indicator: "orange"
								}, 5);

								return;
							}
							
							// Disable button and show processing
							let primary_btn = dialog.get_primary_btn();
							let original_label = primary_btn.html();
							primary_btn.prop("disabled", true).html(__("Processing..."));
							
							// Calculate new checkout date
							let current_checkout_date = moment(current_checkout);
							let new_checkout_date = current_checkout_date.clone().add(values.additional_nights, 'days');
							let additional_charge = price_list_rate * values.additional_nights;
							
							// Create additional sales invoice and update check in
							frappe.call({
								method: "havano_hotel_management.api.create_additional_sales_invoice_with_items",
								args: {
									doc: {
										name: check_in_name,
										check_in: check_in_name,
										check_in_date: check_in_doc.check_in_date,
										check_out_date: new_checkout_date.format('YYYY-MM-DD'),
										guest_name: check_in_doc.guest_name,
										room: selected_room.room_name,
										additional_nights: values.additional_nights,
										price_list_rate: price_list_rate
									},
									charge: additional_charge
								},
								
								freeze_message: __("Extending Stay..."),
								callback: function(r) {
									if (r.message && r.message.sales_invoice) {
										// Update Check In checkout date and nights
										frappe.call({
											method: "frappe.client.set_value",
											args: {
												doctype: "Check In",
												name: check_in_name,
												fieldname: {
													check_out_date: new_checkout_date.format('YYYY-MM-DD'),
													nights: current_nights + values.additional_nights
												}
											},
											callback: function() {
												// Update room checkout date
												frappe.call({
													method: "frappe.client.set_value",
													args: {
														doctype: "Room",
														name: selected_room.room_name,
														fieldname: {
															checkout_date: new_checkout_date.format('YYYY-MM-DD')
														}
													},
													callback: function() {
														dialog.hide();
														frappe.show_alert({
															message: __("Stay extended successfully. Sales Invoice {0} created.", [r.message.sales_invoice]),
															indicator: "green"
														}, 5);

														// Refresh dashboard
														setTimeout(function() {
															me.load_stats();
															me.load_rooms();
														}, 500);
													},
													error: function() {
														// Re-enable button
														primary_btn.prop("disabled", false).html(original_label);
														frappe.show_alert({
															message: __("Stay extended but failed to update room checkout date."),
															indicator: "orange"
														}, 5);

													}
												});
											},
											error: function() {
												// Re-enable button
												primary_btn.prop("disabled", false).html(original_label);
												frappe.show_alert({
													message: __("Sales Invoice created but failed to update checkout date."),
													indicator: "orange"
												}, 5);

											}
										});
									} else {
										// Re-enable button
										primary_btn.prop("disabled", false).html(original_label);
										let error_msg = r.message.message || r.message.error || __("Failed to extend stay.");
										frappe.show_alert({
											message: error_msg,
											indicator: "red"
										}, 5);

									}
								},
								error: function(r) {
									// Re-enable button
									primary_btn.prop("disabled", false).html(original_label);
									let error_msg = __("Failed to extend stay.");
									if (r.message && r.message.exc) {
										error_msg += " " + r.message.exc;
									}
									frappe.show_alert({
										message: error_msg,
										indicator: "red"
									}, 5);

								}
							});
						}
					});
					
					dialog.show();
					
					// Calculate new checkout date and charge when additional nights changes
					setTimeout(function() {
						if (dialog.fields_dict.additional_nights && dialog.fields_dict.additional_nights.$input) {
							dialog.fields_dict.additional_nights.$input.on("change", function() {
								let additional_nights = parseInt(dialog.get_value("additional_nights")) || 1;
								let current_checkout_date = moment(current_checkout);
								let new_checkout_date = current_checkout_date.clone().add(additional_nights, 'days');
								let additional_charge = price_list_rate * additional_nights;
								
								dialog.set_value("new_checkout_date", new_checkout_date.format('YYYY-MM-DD'));
								dialog.set_value("additional_charge", additional_charge);
							});
							
							// Trigger initial calculation
							dialog.fields_dict.additional_nights.$input.trigger("change");
						}
					}, 100);
				},
				error: function() {
					frappe.show_alert({
						message: __("Failed to fetch check in details."),
						indicator: "red"
					}, 5);

				}
			});
		},
		error: function() {
			frappe.show_alert({
				message: __("Failed to fetch room details."),
				indicator: "red"
			}, 5);

		}
	});
}

frappe.pages['hotel-dashboard'].make_dashboard = function(page) {
	let me = this;
	
	// Main container
	me.wrapper = page.main;
	me.wrapper.empty();
	
	// Create stats cards section
	me.make_stats_cards();
	
	// Create filters container first (so it appears above table)
	me.filters_container = $('<div id="filters-container" style="margin-bottom: 5px;"></div>');
	me.filters_container.appendTo(me.wrapper);
	
	// Create table section (will appear below filters)
	me.make_table();
	
	// Create filters section (populate the container)
	me.make_filters();
	
	// Load initial data
	me.load_stats();
	me.load_rooms();
	
	// Run background tasks
	me.run_background_tasks();
}

frappe.pages['hotel-dashboard'].run_background_tasks = function() {
	let me = this;
	
	// Task 1: Clean up expired reservations (rooms reserved but arrival date is not today)
	frappe.call({
		method: "havano_hotel_management.api.cleanup_expired_reservations",
		callback: function(r) {
			if (r.message && r.message.success) {
				console.log("Background task 1 completed:", r.message.message);
				// Refresh data after cleanup
				me.load_stats();
			} else if (r.message && r.message.error) {
				console.error("Background task 1 error:", r.message.error);
			}
		},
		error: function(r) {
			console.error("Background task 1 failed:", r);
		},
		async: true
	});
	
	// Task 2: Update rooms from today's reservations
	frappe.call({
		method: "havano_hotel_management.api.update_rooms_from_today_reservations",
		callback: function(r) {
			if (r.message && r.message.success) {
				console.log("Background task 2 completed:", r.message.message);
				// Refresh data after update
				me.load_stats();
				me.load_rooms();
			} else if (r.message && r.message.error) {
				console.error("Background task 2 error:", r.message.error);
			}
		},
		error: function(r) {
			console.error("Background task 2 failed:", r);
		},
		async: true
	});
}

frappe.pages['hotel-dashboard'].make_stats_cards = function() {
	let me = this;
	
	let cards_html = `
		<div class="dashboard-stats-cards" style="margin-bottom: 8px; display: flex; gap: 6px; flex-wrap: wrap;">
			<div class="stat-card" data-status="vacant" style="flex: 1; min-width: 80px; max-width: 100px; padding: 6px; background: #e8f5e9; border-radius: 4px; border: 1px solid #c8e6c9; cursor: pointer; transition: all 0.2s;">
				<div style="display: flex; align-items: center; gap: 4px;">
					<i class="fa fa-bed" style="font-size: 16px; color: #4caf50;"></i>
					<div>
						<div style="font-size: 18px; font-weight: bold; color: #2e7d32; line-height: 1.2;" id="stat-vacant">0</div>
						<div style="font-size: 13px; color: #666; line-height: 1.2;">Vacant</div>
					</div>
				</div>
			</div>
			<div class="stat-card" data-status="occupied" style="flex: 1; min-width: 80px; max-width: 100px; padding: 6px; background: #fff3e0; border-radius: 4px; border: 1px solid #ffcc80; cursor: pointer; transition: all 0.2s;">
				<div style="display: flex; align-items: center; gap: 4px;">
					<i class="fa fa-user" style="font-size: 16px; color: #ff9800;"></i>
					<div>
						<div style="font-size: 18px; font-weight: bold; color: #e65100; line-height: 1.2;" id="stat-occupied">0</div>
						<div style="font-size: 13px; color: #666; line-height: 1.2;">Occupied</div>
					</div>
				</div>
			</div>
			<div class="stat-card" data-status="reserved" style="flex: 1; min-width: 80px; max-width: 100px; padding: 6px; background: #e3f2fd; border-radius: 4px; border: 1px solid #90caf9; cursor: pointer; transition: all 0.2s;">
				<div style="display: flex; align-items: center; gap: 4px;">
					<i class="fa fa-calendar-check-o" style="font-size: 16px; color: #2196f3;"></i>
					<div>
						<div style="font-size: 18px; font-weight: bold; color: #1565c0; line-height: 1.2;" id="stat-reserved">0</div>
						<div style="font-size: 13px; color: #666; line-height: 1.2;">Reserved</div>
					</div>
				</div>
			</div>
			<div class="stat-card" data-status="due-out" style="flex: 1; min-width: 80px; max-width: 100px; padding: 6px; background: #fce4ec; border-radius: 4px; border: 1px solid #f48fb1; cursor: pointer; transition: all 0.2s;">
				<div style="display: flex; align-items: center; gap: 4px;">
					<i class="fa fa-clock-o" style="font-size: 16px; color: #e91e63;"></i>
					<div>
						<div style="font-size: 18px; font-weight: bold; color: #c2185b; line-height: 1.2;" id="stat-due-out">0</div>
						<div style="font-size: 13px; color: #666; line-height: 1.2;">Due Out</div>
					</div>
				</div>
			</div>
			<div class="stat-card" data-status="dirty" style="flex: 1; min-width: 80px; max-width: 100px; padding: 6px; background: #f3e5f5; border-radius: 4px; border: 1px solid #ce93d8; cursor: pointer; transition: all 0.2s;">
				<div style="display: flex; align-items: center; gap: 4px;">
					<i class="fa fa-exclamation-triangle" style="font-size: 16px; color: #9c27b0;"></i>
					<div>
						<div style="font-size: 18px; font-weight: bold; color: #7b1fa2; line-height: 1.2;" id="stat-dirty">0</div>
						<div style="font-size: 13px; color: #666; line-height: 1.2;">Dirty</div>
					</div>
				</div>
			</div>
			<div class="stat-card" data-status="all" style="flex: 1; min-width: 80px; max-width: 100px; padding: 6px; background: #eceff1; border-radius: 4px; border: 1px solid #b0bec5; cursor: pointer; transition: all 0.2s;">
				<div style="display: flex; align-items: center; gap: 4px;">
					<i class="fa fa-building" style="font-size: 16px; color: #607d8b;"></i>
					<div>
						<div style="font-size: 18px; font-weight: bold; color: #455a64; line-height: 1.2;" id="stat-all">0</div>
						<div style="font-size: 13px; color: #666; line-height: 1.2;">All Rooms</div>
					</div>
				</div>
			</div>
			<button id="refresh-dashboard-btn" class="btn btn-sm btn-default" style="height: 32px; padding: 4px 12px; font-size: 15px; margin-left: auto; display: flex; align-items: center; gap: 4px;" title="Refresh Dashboard">
				<i class="fa fa-refresh"></i> Refresh
			</button>
		</div>
	`;
	
	$(cards_html).appendTo(me.wrapper);
	
	// Add hover effects and click handlers
	$(".stat-card").hover(
		function() { $(this).css("transform", "translateY(-2px)"); },
		function() { $(this).css("transform", "translateY(0)"); }
	);
	
	$(".stat-card").on("click", function() {
		let status = $(this).data("status");
		me.apply_status_filter(status);
	});
	
	// Add refresh button handler
	$(document).off("click", "#refresh-dashboard-btn").on("click", "#refresh-dashboard-btn", function() {
		// Reset to first page
		me.current_page = 1;
		// Refresh stats
		me.load_stats();
		// Refresh rooms table (calls the endpoint with cache busting)
		me.load_rooms(true);
		frappe.show_alert({
			message: __("Dashboard refreshed"),
			indicator: "green"
		}, 2);
	});
}

frappe.pages['hotel-dashboard'].make_filters = function() {
	let me = this;
	
	// Get room types and floors for filters
	frappe.call({
		method: "frappe.client.get_list",
		args: {
			doctype: "Room Type",
			fields: ["name"],
			limit_page_length: 1000
		},
		callback: function(r) {
			let room_types = r.message || [];
			let room_type_options = '<option value="">All Room Types</option>';
			room_types.forEach(function(rt) {
				room_type_options += `<option value="${frappe.utils.escape_html(rt.name)}">${frappe.utils.escape_html(rt.name)}</option>`;
			});
			
			frappe.call({
				method: "frappe.client.get_list",
				args: {
					doctype: "Room Floor",
					fields: ["name"],
					limit_page_length: 1000
				},
				callback: function(r2) {
					let floors = r2.message || [];
					let floor_options = '<option value="">All Floors</option>';
					floors.forEach(function(f) {
						floor_options += `<option value="${frappe.utils.escape_html(f.name)}">${frappe.utils.escape_html(f.name)}</option>`;
					});
					
					let filters_html = `
						<div class="dashboard-filters" style="padding: 8px; background: #f5f5f5; border-radius: 4px; display: flex; gap: 6px; flex-wrap: wrap; align-items: end;">
							<div style="flex: 1; min-width: 120px;">
								<label style="font-size: 13px; color: #666; margin-bottom: 2px; display: block;">Status</label>
								<select class="form-control input-sm" id="filter-status" style="height: 24px; font-size: 14px; padding: 2px 6px;">
									<option value="">All Status</option>
									<option value="Vacant">Vacant</option>
									<option value="Occupied">Occupied</option>
									<option value="Reserved">Reserved</option>
									<option value="Due Out">Due Out</option>
									<option value="Dirty">Dirty</option>
								</select>
							</div>
							<div style="flex: 1; min-width: 120px;">
								<label style="font-size: 13px; color: #666; margin-bottom: 2px; display: block;">Room Type</label>
								<select class="form-control input-sm" id="filter-room-type" style="height: 24px; font-size: 14px; padding: 2px 6px;">
									${room_type_options}
								</select>
							</div>
							<div style="flex: 1; min-width: 120px;">
								<label style="font-size: 13px; color: #666; margin-bottom: 2px; display: block;">Floor</label>
								<select class="form-control input-sm" id="filter-floor" style="height: 24px; font-size: 14px; padding: 2px 6px;">
									${floor_options}
								</select>
							</div>
							<div style="flex: 1; min-width: 120px;">
								<label style="font-size: 13px; color: #666; margin-bottom: 2px; display: block;">Room Number</label>
								<input type="text" class="form-control input-sm" id="filter-room-number" placeholder="Search..." style="height: 24px; font-size: 14px; padding: 2px 6px;">
							</div>
							<div style="flex: 0 0 auto;">
								<button class="btn btn-sm btn-default" id="btn-clear-filters" style="height: 24px; font-size: 14px; padding: 2px 8px; margin-top: 16px;">
									<i class="fa fa-times" style="font-size: 13px;"></i> Clear
								</button>
							</div>
						</div>
					`;
					
					$(filters_html).appendTo(me.filters_container);
					
					// Auto-apply filters on change (with debounce for text input)
					let filterTimeout;
					$("#filter-status, #filter-room-type, #filter-floor").on("change", function() {
						me.apply_filters();
					});
					
					$("#filter-room-number").on("input", function() {
						clearTimeout(filterTimeout);
						filterTimeout = setTimeout(function() {
							me.apply_filters();
						}, 500); // Wait 500ms after user stops typing
					});
					
					// Clear filters button
					$("#btn-clear-filters").on("click", function() {
						me.clear_filters();
					});
				}
			});
		}
	});
}

frappe.pages['hotel-dashboard'].make_table = function() {
	let me = this;
	
	// Add compact table styles
	if (!$("#hotel-dashboard-table-styles").length) {
		$("head").append(`
			<style id="hotel-dashboard-table-styles">
				#rooms-table th, #rooms-table td {
					padding: 4px 6px !important;
					font-size: 15px !important;
					line-height: 1.3 !important;
				}
				#rooms-table thead th {
					font-size: 14px !important;
					font-weight: 600 !important;
					padding: 5px 6px !important;
				}
			</style>
		`);
	}
	
	let table_html = `
		<div class="dashboard-table-container" style="margin-bottom: 10px;">
			<div style="overflow-x: auto;">
				<table class="table table-bordered table-hover" id="rooms-table" style="font-size: 15px;">
					<thead style="background: #f5f5f5;">
						<tr>
							<th style="width: 40px; text-align: center;">
								<input type="checkbox" id="select-all-rooms" style="width: 12px; height: 12px;">
							</th>
							<th style="width: 50px;">S/N</th>
							<th>Room</th>
							<th>Room Type</th>
							<th>Status</th>
							<th>Guest Name</th>
							<th>Arrival</th>
							<th>Departure</th>
							<th>Reservation</th>
							<th style="text-align: right;">Total Balance</th>
						</tr>
					</thead>
					<tbody id="rooms-table-body">
						<tr>
							<td colspan="10" style="text-align: center; padding: 10px;">
								<i class="fa fa-spinner fa-spin"></i> Loading...
							</td>
						</tr>
					</tbody>
				</table>
			</div>
			<div id="pagination-container" style="margin-top: 6px; display: flex; justify-content: space-between; align-items: center;">
				<div style="display: flex; gap: 6px; align-items: center;">
					<button class="btn btn-sm btn-default" id="btn-first-page" disabled style="height: 22px; font-size: 13px; padding: 2px 6px;">
						<i class="fa fa-angle-double-left" style="font-size: 13px;"></i>
					</button>
					<button class="btn btn-sm btn-default" id="btn-prev-page" disabled style="height: 22px; font-size: 13px; padding: 2px 6px;">
						<i class="fa fa-angle-left" style="font-size: 13px;"></i>
					</button>
					<span id="page-info" style="font-size: 14px; padding: 0 6px;"></span>
					<button class="btn btn-sm btn-default" id="btn-next-page" style="height: 22px; font-size: 13px; padding: 2px 6px;">
						<i class="fa fa-angle-right" style="font-size: 13px;"></i>
					</button>
					<button class="btn btn-sm btn-default" id="btn-last-page" style="height: 22px; font-size: 13px; padding: 2px 6px;">
						<i class="fa fa-angle-double-right" style="font-size: 13px;"></i>
					</button>
				</div>
				<div style="display: flex; gap: 6px; align-items: center;">
					<label style="font-size: 14px; margin: 0;">Rows per page:</label>
					<select class="form-control input-sm" id="page-length-select" style="width: 60px; height: 22px; font-size: 14px; padding: 2px 4px;">
						<option value="20">20</option>
						<option value="50">50</option>
						<option value="100">100</option>
					</select>
				</div>
			</div>
		</div>
	`;
	
	$(table_html).appendTo(me.wrapper);
	
	// Initialize pagination
	me.current_page = 1;
	me.page_length = 20;
	me.total_records = 0;
	
	// Add pagination handlers
	$("#btn-first-page").on("click", function() {
		me.current_page = 1;
		me.load_rooms();
	});
	
	$("#btn-prev-page").on("click", function() {
		if (me.current_page > 1) {
			me.current_page--;
			me.load_rooms();
		}
	});
	
	$("#btn-next-page").on("click", function() {
		let total_pages = Math.ceil(me.total_records / me.page_length);
		if (me.current_page < total_pages) {
			me.current_page++;
			me.load_rooms();
		}
	});
	
	$("#btn-last-page").on("click", function() {
		let total_pages = Math.ceil(me.total_records / me.page_length);
		me.current_page = total_pages;
		me.load_rooms();
	});
	
	$("#page-length-select").on("change", function() {
		me.page_length = parseInt($(this).val());
		me.current_page = 1;
		me.load_rooms();
	});
	
	// Select all checkbox
	$("#select-all-rooms").on("change", function() {
		let checked = $(this).is(":checked");
		$(".room-checkbox").prop("checked", checked);
	});
}

frappe.pages['hotel-dashboard'].handle_make_payment = function() {
	let me = this;
	
	// Get all checked rooms
	let checked_rooms = [];
	$(".room-checkbox:checked").each(function() {
		let room_name = $(this).data("room");
		if (room_name && me.rooms_data && me.rooms_data[room_name]) {
			checked_rooms.push(me.rooms_data[room_name]);
		}
	});
	
	// Validate: exactly 1 room selected
	if (checked_rooms.length === 0) {
		frappe.show_alert({
			message: __("Please select a room to make payment."),
			indicator: "orange"
		}, 5);

		return;
	}
	
	if (checked_rooms.length > 1) {
		frappe.show_alert({
			message: __("Please select only one room to make payment."),
			indicator: "orange"
		}, 5);

		return;
	}
	
	let selected_room = checked_rooms[0];
	let balance = parseFloat(selected_room.total_balance || 0);
	let room_status = selected_room.status || "Available";
	
	// Validate: room must have balance, except for reserved rooms
	if (balance <= 0 && room_status !== "Reserved") {
		frappe.show_alert({
			message: __("Room {0} has no outstanding balance.", [selected_room.room]),
			indicator: "orange"
		}, 5);
		return;
	}
	
	// Get Room document to check for check-in and reservation
	frappe.call({
		method: "frappe.client.get",
		args: {
			doctype: "Room",
			name: selected_room.room_name,
			fieldname: ["current_checkin", "reservation"]
		},
		callback: function(room_r) {
			if (!room_r.message) {
				frappe.show_alert({
					message: __("Failed to fetch room details."),
					indicator: "red"
				}, 5);

				return;
			}
			
			let check_in_name = room_r.message.current_checkin;
			let reservation_name = room_r.message.reservation;
			
			// For reserved rooms without check-in, get customer from reservation
			if (room_status === "Reserved" && !check_in_name && reservation_name) {
				// Get reservation details to get customer
				frappe.call({
					method: "frappe.client.get",
					args: {
						doctype: "Reservation",
						name: reservation_name
					},
					callback: function(reservation_r) {
						if (!reservation_r.message) {
							frappe.show_alert({
								message: __("Failed to fetch reservation details."),
								indicator: "red"
							}, 5);

							return;
						}
						
						let reservation_doc = reservation_r.message;
						
						// Validate guest exists
						if (!reservation_doc.guest) {
							frappe.show_alert({
								message: __("Reservation {0} does not have a guest linked.", [reservation_name]),
								indicator: "red"
							}, 5);
							return;
						}
						
						// Get guest to find customer
						frappe.call({
							method: "frappe.client.get",
							args: {
								doctype: "Hotel Guest",
								name: reservation_doc.guest,
								fieldname: ["guest_customer"]
							},
							callback: function(guest_r) {
								if (!guest_r.message) {
									frappe.show_alert({
										message: __("Guest {0} not found.", [reservation_doc.guest]),
										indicator: "red"
									}, 5);
									return;
								}
								
								if (!guest_r.message.guest_customer) {
									frappe.show_alert({
										message: __("Guest {0} does not have a customer linked.", [reservation_doc.guest]),
										indicator: "red"
									}, 5);
									return;
								}
								
								let customer = guest_r.message.guest_customer;
								let total_amount = parseFloat(selected_room.total_balance || 0);
								
								// Create modal dialog for payment (reserved room without check-in)
								me.create_payment_dialog(selected_room, customer, total_amount, null, reservation_name);
							},
							error: function() {
								frappe.show_alert({
									message: __("Failed to fetch guest details."),
									indicator: "red"
								}, 5);

							}
						});
					},
					error: function() {
						frappe.show_alert({
							message: __("Failed to fetch reservation details."),
							indicator: "red"
						}, 5);

					}
				});
				return;
			}
			
			// For rooms with check-in (or reserved rooms with check-in)
			if (!check_in_name) {
				frappe.show_alert({
					message: __("Room {0} does not have an active check in.", [selected_room.room]),
					indicator: "red"
				}, 5);
				return;
			}
			
			// Get Check In details to get customer
			frappe.call({
				method: "frappe.client.get",
				args: {
					doctype: "Check In",
					name: check_in_name
				},
				callback: function(checkin_r) {
					if (!checkin_r.message) {
						frappe.show_alert({
							message: __("Failed to fetch check in details."),
							indicator: "red"
						}, 5);

						return;
					}
					
					let check_in_doc = checkin_r.message;
					
					// Get guest to find customer
					frappe.call({
						method: "frappe.client.get",
						args: {
							doctype: "Hotel Guest",
							name: check_in_doc.guest_name,
							fieldname: ["guest_customer"]
						},
						callback: function(guest_r) {
							if (!guest_r.message || !guest_r.message.guest_customer) {
								frappe.show_alert({
									message: __("Guest {0} does not have a customer linked.", [check_in_doc.guest_name]),
									indicator: "red"
								}, 5);
								return;
							}
							
							let customer = guest_r.message.guest_customer;
							let total_amount = parseFloat(selected_room.total_balance || 0);
							
							// Create modal dialog for payment (with check-in)
							me.create_payment_dialog(selected_room, customer, total_amount, check_in_name, reservation_name);
						},
						error: function() {
							frappe.show_alert({
								message: __("Failed to fetch guest details."),
								indicator: "red"
							}, 5);

						}
					});
				},
				error: function() {
					frappe.show_alert({
						message: __("Failed to fetch check in details."),
						indicator: "red"
					}, 5);

				}
			});
		},
		error: function() {
			frappe.show_alert({
				message: __("Failed to fetch room details."),
				indicator: "red"
			}, 5);

		}
	});
}

frappe.pages['hotel-dashboard'].create_payment_dialog = function(selected_room, customer, total_amount, check_in_name, reservation_name) {
	let me = this;
	
	// Build dialog fields
	let dialog_fields = [
		{
			fieldtype: "Link",
			fieldname: "room",
			label: __("Room"),
			options: "Room",
			default: selected_room.room_name,
			read_only: 1
		}
	];
	
	// Add check-in field if available
	if (check_in_name) {
		dialog_fields.push({
			fieldtype: "Link",
			fieldname: "check_in",
			label: __("Check In"),
			options: "Check In",
			default: check_in_name,
			read_only: 1
		});
	}
	
	// Add reservation field if available
	if (reservation_name) {
		dialog_fields.push({
			fieldtype: "Link",
			fieldname: "reservation",
			label: __("Reservation"),
			options: "Reservation",
			default: reservation_name,
			read_only: 1
		});
	}
	
	// Add customer and amount fields
	dialog_fields.push(
		{
			fieldtype: "Link",
			fieldname: "customer",
			label: __("Customer"),
			options: "Customer",
			default: customer,
			read_only: 1
		},
		{
			fieldtype: "Currency",
			fieldname: "total_amount",
			label: __("Total Amount"),
			default: total_amount,
			read_only: 1
		},
		{
			fieldtype: "Currency",
			fieldname: "amount",
			label: __("Payment Amount"),
			default: total_amount || 0,
			reqd: 1
		},
		{
			fieldtype: "Link",
			fieldname: "payment_method",
			label: __("Mode of Payment"),
			options: "Mode of Payment",
			reqd: 1
		},
		{
			fieldtype: "Date",
			fieldname: "payment_date",
			label: __("Payment Date"),
			default: frappe.datetime.get_today(),
			reqd: 1
		},
		{
			fieldtype: "Data",
			fieldname: "reference_no",
			label: __("Reference No")
		},
		{
			fieldtype: "Date",
			fieldname: "reference_date",
			label: __("Reference Date")
		},
		{
			fieldtype: "Small Text",
			fieldname: "remarks",
			label: __("Remarks")
		}
	);
	
	// Create modal dialog for payment
	let dialog = new frappe.ui.Dialog({
		fields: dialog_fields,
		primary_action_label: __("Make Payment"),
		primary_action: function() {
			let values = dialog.get_values();
			if (!values) {
				return;
			}
			
			// Validate required fields
			if (!values.amount || parseFloat(values.amount) <= 0) {
				frappe.show_alert({
					message: __("Please enter a valid payment amount."),
					indicator: "orange"
				}, 5);

				return;
			}
			
			if (!values.payment_method) {
				frappe.show_alert({
					message: __("Please select a mode of payment."),
					indicator: "orange"
				}, 5);

				return;
			}
			
			// Disable button and show processing
			let primary_btn = dialog.get_primary_btn();
			let original_label = primary_btn.html();
			primary_btn.prop("disabled", true).html(__("Processing..."));
			
			// Create payment entry using Python API - will process all sales invoices for customer
			frappe.call({
				method: "havano_hotel_management.api.make_payment_entry",
				args: {
					payment_method: values.payment_method,
					amount: values.amount,
					payment_date: values.payment_date,
					check_in: values.check_in || null,
					customer: values.customer,
					reference_no: values.reference_no || "",
					reference_date: values.reference_date || "",
					remarks: values.remarks || ""
				},
				
				freeze_message: __("Processing Payment..."),
				callback: function(r) {
					if (r.message && r.message.success && r.message.payment_entry) {
						dialog.hide();
						frappe.show_alert({
							message: r.message.message || __("Payment Entry {0} created and submitted successfully.", [r.message.payment_entry]),
							indicator: "green"
						}, 5);

						// Refresh dashboard
						setTimeout(function() {
							me.load_stats();
							me.load_rooms();
						}, 500);
					} else {
						// Re-enable button
						primary_btn.prop("disabled", false).html(original_label);
						let error_msg = r.message.message || r.message.error || __("Failed to create payment entry.");
						frappe.show_alert({
							message: error_msg,
							indicator: "red"
						}, 5);

					}
				},
				error: function(r) {
					// Re-enable button
					primary_btn.prop("disabled", false).html(original_label);
					let error_msg = __("Failed to create payment entry.");
					if (r.message && r.message.exc) {
						error_msg += " " + r.message.exc;
					}
					frappe.show_alert({
						message: error_msg,
						indicator: "red"
					}, 5);

				}
			});
		}
	});
	
	dialog.show();
}

frappe.pages['hotel-dashboard'].load_stats = function() {
	let me = this;
	
	frappe.call({
		method: "havano_hotel_management.api.get_hotel_dashboard_stats",
		callback: function(r) {
			if (r.message) {
				$("#stat-vacant").text(r.message.vacant || 0);
				$("#stat-occupied").text(r.message.occupied || 0);
				$("#stat-reserved").text(r.message.reserved || 0);
				$("#stat-due-out").text(r.message.due_out || 0);
				$("#stat-dirty").text(r.message.dirty || 0);
				$("#stat-all").text(r.message.all || 0);
			}
		}
	});
}

frappe.pages['hotel-dashboard'].load_rooms = function(force_refresh = false) {
	let me = this;
	
	// Get current filters
	let filters = me.get_current_filters();
	
	let page_start = (me.current_page - 1) * me.page_length;
	
		// Show loading
		$("#rooms-table-body").html(`
			<tr>
				<td colspan="10" style="text-align: center; padding: 20px;">
					<i class="fa fa-spinner fa-spin"></i> Loading...
				</td>
			</tr>
		`);
	
	// Add cache busting timestamp if force_refresh is true
	let args = {
		filters: filters,
		page_length: me.page_length,
		page_start: page_start
	};
	
	if (force_refresh) {
		args._refresh = new Date().getTime();
	}
	
	frappe.call({
		method: "havano_hotel_management.api.get_hotel_dashboard_rooms",
		args: args,
		freeze: true,
		freeze_message: __("Refreshing rooms..."),
		callback: function(r) {
			console.log("API Response:", r); // Debug log
			if (r.message) {
				me.total_records = r.message.total || 0;
				let data = r.message.data || [];
				console.log("Room data:", data); // Debug log
				me.render_table(data);
				me.update_pagination();
			} else {
				console.error("No message in response:", r);
				me.render_table([]);
			}
		},
		error: function(r) {
			console.error("Error loading rooms:", r);
			$("#rooms-table-body").html(`
				<tr>
					<td colspan="10" style="text-align: center; padding: 10px; color: #d32f2f;">
						Error loading rooms. Please refresh the page.
					</td>
				</tr>
			`);
		}
	});
}

frappe.pages['hotel-dashboard'].render_table = function(data) {
	let me = this;
	
	let tbody = $("#rooms-table-body");
	tbody.empty();
	
	// Store room data for later access
	me.rooms_data = {};
	
	if (data.length === 0) {
		tbody.html(`
			<tr>
				<td colspan="10" style="text-align: center; padding: 10px; color: #999;">
					No rooms found
				</td>
			</tr>
		`);
		return;
	}
	
	data.forEach(function(row) {
		// Store room data indexed by room_name
		me.rooms_data[row.room_name] = row;
		// Determine row color based on status (API now returns "Due Out" for occupied rooms with past departure)
		let row_class = "";
		let row_style = "";
		let status = row.status || "Available";
		
		if (status === "Available" || status === "Vacant") {
			row_style = "background-color: #e8f5e9;"; // Light green
		} else if (status === "Occupied") {
			row_style = "background-color: #fff3e0;"; // Light orange for occupied
		} else if (status === "Due Out") {
			row_style = "background-color: #fce4ec;"; // Light pink for due out
		} else if (status === "Reserved") {
			row_style = "background-color: #e3f2fd;"; // Light blue
		}
		
		// Check for Dirty (overrides other colors)
		if (row.housekeeping_status === "Dirty") {
			row_style = "background-color: #f3e5f5;"; // Light purple
		}
		
		// Format status display
		let status_display = status;
		let status_badge_style = "";
		
		if (status === "Available") {
			status_display = "Vacant";
			status_badge_style = "background-color: #4caf50; color: white; padding: 1px 4px; border-radius: 2px; font-size: 13px; font-weight: 500;";
		} else if (status === "Occupied") {
			status_badge_style = "background-color: #ff9800; color: white; padding: 1px 4px; border-radius: 2px; font-size: 13px; font-weight: 500;";
		} else if (status === "Due Out") {
			status_display = "Due Out";
			status_badge_style = "background-color: #e91e63; color: white; padding: 1px 4px; border-radius: 2px; font-size: 13px; font-weight: 500;";
		} else if (status === "Reserved") {
			status_badge_style = "background-color: #2196f3; color: white; padding: 1px 4px; border-radius: 2px; font-size: 13px; font-weight: 500;";
		}
		
		// Add housekeeping status indicator
		if (row.housekeeping_status === "Dirty") {
			status_display += " (Dirty)";
			if (!status_badge_style) {
				status_badge_style = "background-color: #9c27b0; color: white; padding: 1px 4px; border-radius: 2px; font-size: 13px; font-weight: 500;";
			}
		}
		
		let status_html = status_badge_style 
			? `<span style="${status_badge_style}">${frappe.utils.escape_html(status_display)}</span>`
			: frappe.utils.escape_html(status_display);
		
		// Add icons for reserved rooms
		if (status === "Reserved" && row.reservation) {
			status_html += ` <i class="fa fa-edit reservation-edit-icon" data-reservation="${frappe.utils.escape_html(row.reservation)}" data-room="${frappe.utils.escape_html(row.room_name)}" style="cursor: pointer; margin-left: 4px; color: #2196f3; font-size: 15px;" title="Edit Reservation"></i>`;
			status_html += ` <i class="fa fa-times reservation-cancel-icon" data-reservation="${frappe.utils.escape_html(row.reservation)}" data-room="${frappe.utils.escape_html(row.room_name)}" style="cursor: pointer; margin-left: 4px; color: #f44336; font-size: 15px;" title="Cancel Reservation"></i>`;
		}
		
		let row_html = `
			<tr style="${row_style}">
				<td style="text-align: center;">
					<input type="checkbox" class="room-checkbox" data-room="${frappe.utils.escape_html(row.room_name)}" style="width: 12px; height: 12px;">
				</td>
				<td>${row.sn}</td>
				<td>
					<a href="/app/room/${frappe.utils.escape_html(row.room_name)}" target="_blank">${frappe.utils.escape_html(row.room)}</a>
				</td>
				<td>${frappe.utils.escape_html(row.room_type || "-")}</td>
				<td>${status_html}</td>
				<td>${frappe.utils.escape_html(row.guest_name || "-")}</td>
				<td>${frappe.utils.escape_html(row.arrival || "-")}</td>
				<td>${frappe.utils.escape_html(row.departure || "-")}</td>
				<td>${(status === "Available" || status === "Vacant") ? "-" : (row.reservation ? `<a href="/app/reservation/${frappe.utils.escape_html(row.reservation)}" target="_blank">${frappe.utils.escape_html(row.reservation)}</a>` : "-")}</td>
				<td style="text-align: right;">${format_currency(row.total_balance || 0, frappe.defaults.get_default("currency"))}</td>
			</tr>
		`;
		tbody.append(row_html);
	});
	
	// Add event handlers for reservation cancel and edit icons
	$(document).off("click", ".reservation-cancel-icon").on("click", ".reservation-cancel-icon", function(e) {
		e.stopPropagation();
		let reservation_name = $(this).data("reservation");
		let room_name = $(this).data("room");
		me.handle_cancel_reservation(reservation_name, room_name);
	});
	
	$(document).off("click", ".reservation-edit-icon").on("click", ".reservation-edit-icon", function(e) {
		e.stopPropagation();
		let reservation_name = $(this).data("reservation");
		let room_name = $(this).data("room");
		me.handle_edit_reservation(reservation_name, room_name);
	});
}

frappe.pages['hotel-dashboard'].update_pagination = function() {
	let me = this;
	
	let total_pages = Math.ceil(me.total_records / me.page_length);
	let start_record = (me.current_page - 1) * me.page_length + 1;
	let end_record = Math.min(me.current_page * me.page_length, me.total_records);
	
	$("#page-info").text(`Page ${me.current_page} of ${total_pages || 1} (${start_record}-${end_record} of ${me.total_records})`);
	$("#table-info").text(`Total: ${me.total_records} rooms`);
	
	// Update button states
	$("#btn-first-page").prop("disabled", me.current_page === 1);
	$("#btn-prev-page").prop("disabled", me.current_page === 1);
	$("#btn-next-page").prop("disabled", me.current_page >= total_pages);
	$("#btn-last-page").prop("disabled", me.current_page >= total_pages);
}

frappe.pages['hotel-dashboard'].get_current_filters = function() {
	let me = this;
	
	// Return empty filters if filter elements don't exist yet
	if ($("#filter-status").length === 0) {
		return {
			status: "",
			room_type: "",
			floor: "",
			room_number: ""
		};
	}
	
	return {
		status: $("#filter-status").val() || "",
		room_type: $("#filter-room-type").val() || "",
		floor: $("#filter-floor").val() || "",
		room_number: $("#filter-room-number").val() || ""
	};
}

frappe.pages['hotel-dashboard'].apply_filters = function() {
	let me = this;
	me.current_page = 1;
	me.load_rooms();
}

frappe.pages['hotel-dashboard'].clear_filters = function() {
	let me = this;
	
	$("#filter-status").val("");
	$("#filter-room-type").val("");
	$("#filter-floor").val("");
	$("#filter-room-number").val("");
	
	me.current_page = 1;
	me.load_rooms();
}

frappe.pages['hotel-dashboard'].apply_status_filter = function(status) {
	let me = this;
	
	// Map status to filter value
	let status_map = {
		"vacant": "Vacant",
		"occupied": "Occupied",
		"reserved": "Reserved",
		"due-out": "Due Out",
		"dirty": "Dirty",
		"all": ""
	};
	
	$("#filter-status").val(status_map[status] || "");
	me.apply_filters();
}

frappe.pages['hotel-dashboard'].handle_cancel_reservation = function(reservation_name, room_name) {
	let me = this;
	
	// Show confirmation dialog
	frappe.confirm(
		__("Are you sure you want to cancel reservation {0}? This will make the room available.", [reservation_name]),
		function() {
			// User confirmed - cancel the reservation
			frappe.call({
				method: "havano_hotel_management.api.cancel_reservation",
				args: {
					reservation_name: reservation_name,
					room_name: room_name
				},
				callback: function(r) {
					if (r.message && r.message.success) {
						frappe.show_alert({
							message: __("Reservation {0} has been cancelled successfully.", [reservation_name]),
							indicator: "green"
						}, 5);

						// Refresh the dashboard
						me.load_stats();
						me.load_rooms();
					} else {
						frappe.show_alert({
							message: r.message.message || r.message.error || __("Failed to cancel reservation."),
							indicator: "red"
						}, 5);

					}
				},
				error: function(r) {
					frappe.show_alert({
						message: __("Failed to cancel reservation: {0}", [r.message && r.message.exc ? r.message.exc : r.message || "Unknown error"]),
						indicator: "red"
					}, 5);
				}
			});
		}
	);
}

frappe.pages['hotel-dashboard'].handle_edit_reservation = function(reservation_name, room_name) {
	let me = this;
	
	// Fetch reservation details
	frappe.call({
		method: "frappe.client.get",
		args: {
			doctype: "Reservation",
			name: reservation_name
		},
		callback: function(r) {
			if (!r.message) {
				frappe.show_alert({
					message: __("Failed to fetch reservation details."),
					indicator: "red"
				}, 5);

				return;
			}
			
			let reservation = r.message;
			
			// Create edit dialog
			let dialog = new frappe.ui.Dialog({
				fields: [
					{
						fieldtype: "Link",
						fieldname: "room",
						label: __("Room"),
						options: "Room",
						default: room_name,
						read_only: 1
					},
					{
						fieldtype: "Link",
						fieldname: "reservation",
						label: __("Reservation"),
						options: "Reservation",
						default: reservation_name,
						read_only: 1
					},
					{
						fieldtype: "Link",
						fieldname: "guest",
						label: __("Guest"),
						options: "Hotel Guest",
						default: reservation.guest || "",
						read_only: 1
					},
					{
						fieldtype: "Date",
						fieldname: "check_in_date",
						label: __("Check In Date"),
						default: reservation.check_in_date || frappe.datetime.get_today(),
						reqd: 1
					},
					{
						fieldtype: "Date",
						fieldname: "check_out_date",
						label: __("Check Out Date"),
						default: reservation.check_out_date || "",
						reqd: 1
					},
					{
						fieldtype: "Int",
						fieldname: "nights",
						label: __("Nights"),
						default: reservation.nights || 1,
						reqd: 1
					}
				],
				primary_action_label: __("Update"),
				primary_action: function(values) {
					// Calculate nights if check_in_date or check_out_date changed
					let check_in = frappe.datetime.str_to_obj(values.check_in_date);
					let check_out = frappe.datetime.str_to_obj(values.check_out_date);
					
					if (check_in && check_out) {
						let diff = frappe.datetime.get_diff(check_out, check_in);
						if (diff > 0) {
							values.nights = diff;
						}
					}
					
					// Update reservation
					frappe.call({
						method: "havano_hotel_management.api.update_reservation",
						args: {
							reservation_name: reservation_name,
							guest: values.guest,
							check_in_date: values.check_in_date,
							check_out_date: values.check_out_date,
							nights: values.nights
						},
						callback: function(r) {
							if (r.message && r.message.success) {
								frappe.show_alert({
									message: __("Reservation {0} has been updated successfully.", [reservation_name]),
									indicator: "green"
								}, 5);

								dialog.hide();
								// Refresh the dashboard
								me.load_stats();
								me.load_rooms();
							} else {
								frappe.show_alert({
									message: r.message.message || r.message.error || __("Failed to update reservation."),
									indicator: "red"
								}, 5);

							}
						},
						error: function(r) {
							frappe.show_alert({
								message: __("Failed to update reservation: {0}", [r.message && r.message.exc ? r.message.exc : r.message || "Unknown error"]),
								indicator: "red"
							}, 5);
						}
					});
				}
			});
			
			// Add bidirectional calculation for dates and nights
			dialog.fields_dict.check_in_date.$input.on("change", function() {
				let check_in = frappe.datetime.str_to_obj(dialog.get_value("check_in_date"));
				let check_out = frappe.datetime.str_to_obj(dialog.get_value("check_out_date"));
				let nights = parseInt(dialog.get_value("nights")) || 1;
				
				if (check_in && check_out) {
					let diff = frappe.datetime.get_diff(check_out, check_in);
					if (diff > 0) {
						dialog.set_value("nights", diff);
					}
				} else if (check_in && nights) {
					let new_check_out = frappe.datetime.add_days(check_in, nights);
					dialog.set_value("check_out_date", frappe.datetime.obj_to_str(new_check_out));
				}
			});
			
			dialog.fields_dict.check_out_date.$input.on("change", function() {
				let check_in = frappe.datetime.str_to_obj(dialog.get_value("check_in_date"));
				let check_out = frappe.datetime.str_to_obj(dialog.get_value("check_out_date"));
				
				if (check_in && check_out) {
					let diff = frappe.datetime.get_diff(check_out, check_in);
					if (diff > 0) {
						dialog.set_value("nights", diff);
					}
				}
			});
			
			dialog.fields_dict.nights.$input.on("change input", function() {
				let check_in = frappe.datetime.str_to_obj(dialog.get_value("check_in_date"));
				let nights = parseInt(dialog.get_value("nights")) || 1;
				
				if (check_in && nights > 0) {
					let new_check_out = frappe.datetime.add_days(check_in, nights);
					dialog.set_value("check_out_date", frappe.datetime.obj_to_str(new_check_out));
				}
			});
			
			dialog.show();
		},
		error: function(r) {
			frappe.show_alert({
				message: __("Failed to fetch reservation details: {0}", [r.message && r.message.exc ? r.message.exc : r.message || "Unknown error"]),
				indicator: "red"
			}, 5);
		}
	});
}

// Helper function to format currency
function format_currency(value, currency) {
	if (!value && value !== 0) return "0.00";
	
	// Ensure value is a number
	let numValue = parseFloat(value);
	if (isNaN(numValue)) return "0.00";
	
	// Format number with 2 decimal places and thousand separators
	let formatted = Math.abs(numValue).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	
	// Add negative sign if needed
	if (numValue < 0) {
		formatted = "-" + formatted;
	}
	
	// Simple formatting without frappe.format to avoid stack overflow
	// Just return the formatted number
	return formatted;
}
