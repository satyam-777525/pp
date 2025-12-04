import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import './Invoices.css';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await api.get('/api/invoices/my-invoices');
      if (response.data && Array.isArray(response.data)) {
        setInvoices(response.data);
      } else {
        setInvoices([]);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error.response?.data || error.message);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = (invoice) => {
    if (invoice.pdf_path) {
      const link = document.createElement('a');
      link.href = invoice.pdf_path;
      link.download = `${invoice.invoice_number}.pdf`;
      link.click();
    } else {
      alert('PDF not available');
    }
  };

  if (loading) {
    return <div className="container main-content">Loading invoices...</div>;
  }

  return (
    <div className="container main-content">
      <h1>Invoices</h1>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Invoice Number</th>
              <th>Order Number</th>
              <th>Issue Date</th>
              <th>Due Date</th>
              <th>Total Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>No invoices found</td>
              </tr>
            ) : (
              invoices.map(invoice => (
                <tr key={invoice.id}>
                  <td>{invoice.invoice_number}</td>
                  <td>{invoice.order_number}</td>
                  <td>{new Date(invoice.issue_date).toLocaleDateString()}</td>
                  <td>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}</td>
                  <td>${parseFloat(invoice.total_amount || 0).toFixed(2)}</td>
                  <td>
                    <span className={`status-badge status-${invoice.status}`}>
                      {invoice.status?.toUpperCase() || '-'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => downloadInvoice(invoice)}
                    >
                      Download PDF
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Invoices;
