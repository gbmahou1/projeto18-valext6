import * as companyRepository from "../repositories/companyRepository"
import * as employeeRepository from "../repositories/employeeRepository";
import * as cardRepository from "../repositories/cardRepository";
import * as rechargeRepository from "../repositories/rechargeRepository";
import * as businessRepository from "../repositories/businessRepository";
import * as paymentRepository from "../repositories/paymentRepository";
import { faker } from "@faker-js/faker";
import dayjs from "dayjs";
import bcrypt from "bcrypt"

export async function create(apiKey: string, employeeId: number, type: "groceries" | "restaurant" | "transport" | "education" | "health"){
    const company = await companyRepository.findByApiKey(apiKey);
    if(!company){
        throw { type: "unauthorized" };
    } 
    const employee = await employeeRepository.findById(employeeId);
    if(!employee)
    {
        throw { type: "bad_request" };
    }
    const existingCard = await cardRepository.findByTypeAndEmployeeId(type, employeeId);
    if(existingCard)
    {
        throw { type: "conflict" };
    }
    const cardNumber = faker.finance.creditCardNumber('mastercard');
    const [firstName, ...otherNames] = employee.fullName.split(" ");
    const filteredMiddleNames = otherNames.filter(name => name.length>=3);
    const lastName = filteredMiddleNames.pop();
    const cardholderName = `${firstName} ${filteredMiddleNames.map((name) => name[0]).join(" ")} ${lastName}`.toLocaleUpperCase();
    const expirationDate = dayjs().add(5, 'year').format('MM/YY');
    const hashedSecurityCode = bcrypt.hash(faker.finance.creditCardCVV(), 8);
    await cardRepository.insert({ 
        employeeId, 
        number: cardNumber,
        cardholderName,
        securityCode: `${hashedSecurityCode}`,
        expirationDate,
        isVirtual: false,
        isBlocked: false,
        type,
    })

}

export async function activate(id: number, cvc: string, password: string){
    const card = await cardRepository.findById(id);
    if(!card)
    {
        throw{type: "not_found"};
    }
    const today = dayjs().format("MM/YY");
    if(dayjs(today).isAfter(dayjs(card.expirationDate)))
    {
        throw {type: "bad_request" };
    }
    if(card.password)
    {
        throw {type: "bad_request"};
    }
    const isCvcValid = bcrypt.compareSync(cvc, card.securityCode);
    if(!isCvcValid)
    {
        throw{type: "unauthorized"};
    }
    if(password.length != 4)
    {
        throw {type: "bad_request"};
    }
    const hashedPassword = bcrypt.hashSync(password, 7);
    await cardRepository.update(id, {password: hashedPassword});
}

export async function recharge(apiKey: string, id: number, amount: number){
    const company = await companyRepository.findByApiKey(apiKey);
    if(!company){
        throw { type: "unauthorized" };
    } 
    const card = await cardRepository.findById(id);
    if(!card)
    {
        throw{type: "not_found"};
    }
    const today = dayjs().format("MM/YY");
    if(dayjs(today).isAfter(dayjs(card.expirationDate)))
    {
        throw {type: "bad_request" };
    }
    if(card.password)
    {
        throw {type: "bad_request"};
    }
    await rechargeRepository.insert({ cardId: id, amount }); 
}

export async function payment(id: number, password: string, businessId: number, amount: number){
    const card = await cardRepository.findById(id);
    if(!card)
    {
        throw{type: "not_found"};
    }
    const today = dayjs().format("MM/YY");
    if(dayjs(today).isAfter(dayjs(card.expirationDate)))
    {
        throw {type: "bad_request" };
    }
    const isPasswordValid = bcrypt.compareSync(password, String(card.password));
    if(!isPasswordValid)
    {
        throw{type: "unauthorized"};
    }
    const business = await businessRepository.findById(id);
    if(!business)
    {
        throw{type: "not_found"}
    }
    if(card.type != business.type)
    {
        throw{type: "bad_request"}
    }
    const payments = await paymentRepository.findByCardId(id);
    const recharges = await rechargeRepository.findByCardId(id);
    const totalPaymentsAmount = payments.reduce((amount, payment) => {
        return Number(amount) + payment.amount;
    }, 0);
    const totalRechargesAmount = recharges.reduce((amount, payment) => {
        return Number(amount) + payment.amount;
    }, 0);
    const cardAmount = totalRechargesAmount - totalPaymentsAmount;
    if(cardAmount < amount)
    {
        throw{type: "bad_request"};
    }
    await paymentRepository.insert({ cardId: id, businessId, amount }); 
}