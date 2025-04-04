/*
Hyperledger Cactus Plugin - HTLC ETH BESU ERC20

Allows Cactus nodes to interact with HTLC contracts with ERC-20 Tokens

API version: 2.1.0
*/

// Code generated by OpenAPI Generator (https://openapi-generator.tech); DO NOT EDIT.

package cactus-plugin-htlc-eth-besu-erc20

import (
	"encoding/json"
)

// checks if the InvokeContractV1Response type satisfies the MappedNullable interface at compile time
var _ MappedNullable = &InvokeContractV1Response{}

// InvokeContractV1Response struct for InvokeContractV1Response
type InvokeContractV1Response struct {
	TransactionReceipt *Web3TransactionReceipt `json:"transactionReceipt,omitempty"`
	CallOutput interface{} `json:"callOutput,omitempty"`
	Success bool `json:"success"`
}

// NewInvokeContractV1Response instantiates a new InvokeContractV1Response object
// This constructor will assign default values to properties that have it defined,
// and makes sure properties required by API are set, but the set of arguments
// will change when the set of required properties is changed
func NewInvokeContractV1Response(success bool) *InvokeContractV1Response {
	this := InvokeContractV1Response{}
	this.Success = success
	return &this
}

// NewInvokeContractV1ResponseWithDefaults instantiates a new InvokeContractV1Response object
// This constructor will only assign default values to properties that have it defined,
// but it doesn't guarantee that properties required by API are set
func NewInvokeContractV1ResponseWithDefaults() *InvokeContractV1Response {
	this := InvokeContractV1Response{}
	return &this
}

// GetTransactionReceipt returns the TransactionReceipt field value if set, zero value otherwise.
func (o *InvokeContractV1Response) GetTransactionReceipt() Web3TransactionReceipt {
	if o == nil || IsNil(o.TransactionReceipt) {
		var ret Web3TransactionReceipt
		return ret
	}
	return *o.TransactionReceipt
}

// GetTransactionReceiptOk returns a tuple with the TransactionReceipt field value if set, nil otherwise
// and a boolean to check if the value has been set.
func (o *InvokeContractV1Response) GetTransactionReceiptOk() (*Web3TransactionReceipt, bool) {
	if o == nil || IsNil(o.TransactionReceipt) {
		return nil, false
	}
	return o.TransactionReceipt, true
}

// HasTransactionReceipt returns a boolean if a field has been set.
func (o *InvokeContractV1Response) HasTransactionReceipt() bool {
	if o != nil && !IsNil(o.TransactionReceipt) {
		return true
	}

	return false
}

// SetTransactionReceipt gets a reference to the given Web3TransactionReceipt and assigns it to the TransactionReceipt field.
func (o *InvokeContractV1Response) SetTransactionReceipt(v Web3TransactionReceipt) {
	o.TransactionReceipt = &v
}

// GetCallOutput returns the CallOutput field value if set, zero value otherwise (both if not set or set to explicit null).
func (o *InvokeContractV1Response) GetCallOutput() interface{} {
	if o == nil {
		var ret interface{}
		return ret
	}
	return o.CallOutput
}

// GetCallOutputOk returns a tuple with the CallOutput field value if set, nil otherwise
// and a boolean to check if the value has been set.
// NOTE: If the value is an explicit nil, `nil, true` will be returned
func (o *InvokeContractV1Response) GetCallOutputOk() (*interface{}, bool) {
	if o == nil || IsNil(o.CallOutput) {
		return nil, false
	}
	return &o.CallOutput, true
}

// HasCallOutput returns a boolean if a field has been set.
func (o *InvokeContractV1Response) HasCallOutput() bool {
	if o != nil && IsNil(o.CallOutput) {
		return true
	}

	return false
}

// SetCallOutput gets a reference to the given interface{} and assigns it to the CallOutput field.
func (o *InvokeContractV1Response) SetCallOutput(v interface{}) {
	o.CallOutput = v
}

// GetSuccess returns the Success field value
func (o *InvokeContractV1Response) GetSuccess() bool {
	if o == nil {
		var ret bool
		return ret
	}

	return o.Success
}

// GetSuccessOk returns a tuple with the Success field value
// and a boolean to check if the value has been set.
func (o *InvokeContractV1Response) GetSuccessOk() (*bool, bool) {
	if o == nil {
		return nil, false
	}
	return &o.Success, true
}

// SetSuccess sets field value
func (o *InvokeContractV1Response) SetSuccess(v bool) {
	o.Success = v
}

func (o InvokeContractV1Response) MarshalJSON() ([]byte, error) {
	toSerialize,err := o.ToMap()
	if err != nil {
		return []byte{}, err
	}
	return json.Marshal(toSerialize)
}

func (o InvokeContractV1Response) ToMap() (map[string]interface{}, error) {
	toSerialize := map[string]interface{}{}
	if !IsNil(o.TransactionReceipt) {
		toSerialize["transactionReceipt"] = o.TransactionReceipt
	}
	if o.CallOutput != nil {
		toSerialize["callOutput"] = o.CallOutput
	}
	toSerialize["success"] = o.Success
	return toSerialize, nil
}

type NullableInvokeContractV1Response struct {
	value *InvokeContractV1Response
	isSet bool
}

func (v NullableInvokeContractV1Response) Get() *InvokeContractV1Response {
	return v.value
}

func (v *NullableInvokeContractV1Response) Set(val *InvokeContractV1Response) {
	v.value = val
	v.isSet = true
}

func (v NullableInvokeContractV1Response) IsSet() bool {
	return v.isSet
}

func (v *NullableInvokeContractV1Response) Unset() {
	v.value = nil
	v.isSet = false
}

func NewNullableInvokeContractV1Response(val *InvokeContractV1Response) *NullableInvokeContractV1Response {
	return &NullableInvokeContractV1Response{value: val, isSet: true}
}

func (v NullableInvokeContractV1Response) MarshalJSON() ([]byte, error) {
	return json.Marshal(v.value)
}

func (v *NullableInvokeContractV1Response) UnmarshalJSON(src []byte) error {
	v.isSet = true
	return json.Unmarshal(src, &v.value)
}


