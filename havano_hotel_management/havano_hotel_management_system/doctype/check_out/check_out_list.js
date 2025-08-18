frappe.listview_settings['Check Out'] = {
    onload: function(listview) {
        // Hide the "Add Check Out" button when list view loads
        $('.primary-action').hide();
    }
};
