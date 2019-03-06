/* eslint-disable */

import {
	append,
	filter
} from "ramda";

import { Request, Response, Error, Router } from "express";
import User from "../models/user";
import Place from "../models/place";
import VerifyToken from "./VerifyToken";
import { encrypt, decrypt } from "./test";
import cloudinary from "cloudinary";

const HTTPS_REGEX = "^https?://(.*)";

const errorMessages = {
	userCreation: "Error creating the user",
	userFind: "Error finding the user",
	userUpdate: "Error updating the user",
	userIdMatch: "User's ID not matching user's info",
	placeCreation: "Error creating the place",
	placeFind: "Error finding the place",
	placeUpdate: "Error updating the place",
	placeAlreadyUsed: "Place already used by : ",
	invalidArguments: "Invalid arguments"
}

const successMessages = {
	takePlace: "Place successfully assigned to user",
	leavePlace: "User successfully left the place"
}

const resultCodes = {
	success: 200,
	syntaxError: 400,
	serverError: 500
}

interface Request {
	userId?: string | Buffer | DataView;
	body: any;
}

let RES;

const post = (router: Router) => {
	
	/**
	 * This function adds a new user.
	 * @param {string} id_user id of the new user
	 * @param {string} name name of the new user
	 * @param {string} fname first name of the new user
	 */
	function addUser(
		id_user: string,
		name: string,
		fname: string
	) {
		const user = new User();
		user.id = id_user;
		user.name = name;
		user.fname = fname;
	
		user.save((err: Error) => {
			if (err) RES.status(resultCodes.serverError).send(errorMessages.userCreation);
			console.log("User created");
		});
	}

	/**
	 * This function updates an existing user.
	 * @param {string} id_user id of the user
	 * @param {object} params list of fields to be updated
	 */
	function updateUser(
		id_user: string,
		params
	) {
		User.updateOne({ id: id_user }, params, (err: Error) => {
			if (err) console.log(err);
			console.log("User updated");
		})
	}
	
	/**
	 * This function uploads and then updates a user's photo
	 * @param id_user id of the user
	 * @param photo base64 image
	 */
	async function updatePhoto(
		id_user: string,
		photo: string
	) {
		const url = await uploadPhoto(photo);
		updateUser(id_user, { photo: url });
	}
	
	/**
	 * This function uploads a photo and returns its url
	 * @param photo base64 image
	 * @returns the url of the uploaded image
	 */
	function uploadPhoto(photo) {
		return cloudinary.uploader
			.upload("data:image/jpeg;base64," + photo)
			.then(result => result.secure_url)
			.catch(error => console.log(error));
	}

	/**
	 * This function adds a new place.
	 * @param {string} id_place id of the new place
	 * @param {boolean} using whether the place must be set as used or not
	 * @param {string} id_user id of the user in case the place is set as used
	 */
	function addPlace(
		id_place: string,
		using = false,
		id_user = ""
	) {
		const place = new Place()
		place.id = id_place;
		place.using = using;
		place.id_user = id_user;
	
		place.save((err: Error) => {
			if (err) RES.status(resultCodes.serverError).send(errorMessages.placeCreation);
			console.log("Place created");
		});
	}

	/**
	 * This function updates an existing place.
	 * @param {string} id_place id of the place
	 * @param {object} params list of fields to be updated
	 */
	function updatePlace(
		id_place: string | object, // should only be string, will be fixed
		params
	) {
		Place.updateOne({ id: id_place }, params, (err: Error) => {
			if (err) console.log(err);
			console.log("Place updated");
		})
	}

	/**
	 * This function is used to get a user document from the database.
	 * @param id_user the id of the user
	 * @returns an object containing the fields of the user if found, else null
	 */
	 const getUserById = (id_user: string) => User.findOne({ id: id_user }).then(user => user);

	 /**
	 * This function is used to get a place document from the database.
	 * @param id_place the id of the place
	 * @returns an object containing the fields of the place if found, else null
	 */
	const getPlaceById = (id_place: string) => Place.findOne({ id: id_place }).then(place => place);

	/**
	 * This function states whether a user is already registered in the database,
	 * based on their id.
	 * @param id_user the id of the user
	 */
	async function userExists(
		id_user: string
	) {
		const user = await getUserById(id_user);
		if (user) return true;
		return false;
	}

	/**
	 * This function checks if the info entered when logging in match
	 * the info saved in the database.
	 * @param user the user from the database
	 * @param info the user entered in login form
	 */
	function matchUserInfo(
		user,
		info
	) {
		if (user.fname !== info.fname || user.name !== info.name) return false;
		return true;
	}

	/**
	 * This function is used to know if a place exists and who uses it.
	 * @param {string} id_place id of the current place
	 */
	async function whoUses(id_place: string) {
		const place = await getPlaceById(id_place);
		if (place) return place.id_user; // will return "" if not used, or user's id if used
		return "#";
	}

	/**
	 * This route is used to handle users login.
	 */
	router
		.route("/login_user")

		.post(VerifyToken, async (req: Request, res: Response) => {
			const body = req.body;
			if (
				body.name === null ||
				body.fname === null ||
				body.id_user === null ||
				body.id_user.match(process.env.LOGIN_REGEX) === null
			)
				return res.status(resultCodes.syntaxError).json(errorMessages.invalidArguments);
			body.id_user = encrypt(body.id_user, req.userId);
			body.name = encrypt(body.name, req.userId);
			body.fname = encrypt(body.fname, req.userId);

			if (await userExists(body.id_user)) {
				const user = await getUserById(body.id_user);
				if (await matchUserInfo(user, body)) res.status(resultCodes.success).send({ user: user });
				else res.status(resultCodes.serverError).send(errorMessages.userIdMatch);
			}

			else {
				addUser(body.id_user, body.name, body.fname);
				res.status(resultCodes.success).json({ result: "User Added" });
			}
		});
	
	/**
	 * This route is used to assign a place to a user.
	 */
	router
		.route("/take_place")

		.post(VerifyToken, async (req: Request, res: Response) => {
			const body = req.body;
			if (!body.id_place || !body.id_user) {
				return res.status(resultCodes.syntaxError).send(errorMessages.invalidArguments);
			}

			const id_place = body.id_place;
			const usedById = await whoUses(id_place);
			
			if (usedById === "#" || usedById === "") {
				const id_user = encrypt(body.id_user, req.userId);
				const historical = await getUserById(id_user).then(user => user.historical);
				const beginDate = new Date(Date.now()).toLocaleString();
				if (usedById === "#") {
					console.log("Place doesn't exist");
					addPlace(id_place, true, id_user);
				}
				else {
					console.log("Place exists and is free");
					updatePlace(id_place, { using: true, id_user: id_user });
				}
				updateUser(id_user, {
					id_place: id_place,
					historical: [...historical, { id_place: id_place, begin: beginDate, end: "" }]
				});
				res.status(resultCodes.success).send(successMessages.takePlace);
			}
			
			else {
				console.log("Place already used");
				const user = await getUserById(usedById);
				const name = decrypt(user.name, req.userId);
				const fname = decrypt(user.fname, req.userId);
				res.status(resultCodes.serverError).json({
					name: name,
					fname: fname
				});
			}
		});

	router
		.route("/leave_place")

		.post(VerifyToken, async (req: Request, res: Response) => {
			const body = req.body;
			if (!body.id_place || !body.id_user) {
				return res.status(resultCodes.syntaxError).send(errorMessages.invalidArguments);
			}
			const id_user = encrypt(body.id_user, req.userId);
			const historical = await getUserById(id_user).then(user => user.historical);
			const endDate = new Date(Date.now()).toLocaleString();
			historical[historical.length - 1].end = endDate; // set the end date of the last place in array
			
			updateUser(id_user, { historical: historical, id_place: "" });
			updatePlace(body.id_place, { using: false, id_user: "" });
			
			res.status(resultCodes.success).send(successMessages.leavePlace);
		});

	/**
	 * This route is used to add a friend.
	 */
	router
		.route("/add_friend")

		.post(VerifyToken, (req: Request, res: Response) => {
			const body = req.body;
			RES = res;
			const id_user = encrypt(body.id_user, req.userId);

			User.findOne(
				{ id: id_user },
				null,
				{ sort: { _id: -1 } },
				(err: Error, user) => {
					if (err) RES.status(resultCodes.syntaxError).send(errorMessages.userFind);
					else if (user) {
						user.friend = append(
							{
								id: body.id,
								name: body.name,
								fname: body.fname,
								id_place: body.id_place,
								photo: body.photo
							},
							user.friend
						);
						user.save((err: Error) => {
							if (err) RES.status(resultCodes.serverError).send(errorMessages.userUpdate);
							RES.status(resultCodes.success).send({ user });
						});
					}
				}
			);
		});

	/**
	 * This route is used to remove a friend.
	 */
	router
		.route("/remove_friend")

		.post(VerifyToken, (req: Request, res: Response) => {
			const body = req.body;
			RES = res;
			const id_user = encrypt(body.id_user, req.userId);

			User.findOne(
				{ id: id_user },
				null,
				{ sort: { _id: -1 } },
				(err: Error, user) => {
					if (err) RES.status(resultCodes.syntaxError).send(errorMessages.userFind);
					else if (user) {
						const isRemovedUser = userFriend => userFriend.id !== body.id;
						user.friend = filter(isRemovedUser, user.friend);
						user.save((err: Error) => {
							if (err) RES.status(resultCodes.serverError).send(errorMessages.userUpdate);
							RES.status(resultCodes.success).send({ user });
						});
					}
				}
			);
		});

	router
		.route("/settings_user")

		.post(VerifyToken, (req: Request, res: Response) => {
			const body = req.body;
			const id_user = encrypt(body.id_user, req.userId);

			if (
				body.photo &&
				body.photo.match(HTTPS_REGEX) === null &&
				(body.photo !== "" || body.photo !== null)
			) updatePhoto(id_user, body.photo);
			
			if (body.remoteDay !== "") updateUser(id_user, { remoteDay: body.remoteDay });
			res.status(resultCodes.success).send({success: "success"});
		});
};

export default post;
